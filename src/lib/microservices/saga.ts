import { SagaStep, SagaStatus, SagaExecutionResult } from './types';
import { logger } from '@/lib/logger';
import { generateRequestId } from '@/lib/errors/apiError';

export class SagaOrchestrator<TContext extends Record<string, any> = Record<string, any>> {
  private steps: SagaStep<TContext>[] = [];
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Registers a sequential step with its corresponding compensating action
   */
  addStep(
    name: string,
    action: (context: TContext) => Promise<any> | any,
    compensation: (context: TContext, error?: unknown) => Promise<void> | void
  ): this {
    this.steps.push({ name, action, compensation });
    return this;
  }

  /**
   * Returns list of configured step names
   */
  getStepNames(): string[] {
    return this.steps.map((s) => s.name);
  }

  /**
   * Executes the saga transaction.
   * If any step fails, executes compensating actions in reverse order for all completed steps.
   */
  async execute(
    initialContext: TContext,
    options: { correlationId?: string } = {}
  ): Promise<SagaExecutionResult<TContext>> {
    const correlationId = options.correlationId || generateRequestId();
    const context: TContext = { ...initialContext };
    const completedSteps: string[] = [];
    const compensatedSteps: string[] = [];
    const startTime = Date.now();
    let status: SagaStatus = 'RUNNING';
    let failureError: string | undefined = undefined;

    logger.info(`[Saga:${this.name}] Started execution`, {
      correlationId,
      totalSteps: this.steps.length,
      stepNames: this.getStepNames(),
    });

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      try {
        logger.debug(`[Saga:${this.name}] Executing step: ${step.name}`, { correlationId, stepIndex: i });
        const stepResult = await step.action(context);

        if (stepResult && typeof stepResult === 'object') {
          Object.assign(context, stepResult);
        }

        completedSteps.push(step.name);
        logger.debug(`[Saga:${this.name}] Step succeeded: ${step.name}`, { correlationId });
      } catch (err: any) {
        failureError = err instanceof Error ? err.message : String(err);
        status = 'COMPENSATING';
        logger.warn(`[Saga:${this.name}] Step failed: ${step.name}. Beginning compensation.`, {
          correlationId,
          error: failureError,
          completedCount: completedSteps.length,
        });

        // Compensate completed steps in reverse order
        for (let j = completedSteps.length - 1; j >= 0; j--) {
          const compStepName = completedSteps[j];
          const stepToCompensate = this.steps.find((s) => s.name === compStepName);
          if (stepToCompensate) {
            try {
              logger.debug(`[Saga:${this.name}] Compensating step: ${compStepName}`, { correlationId });
              await stepToCompensate.compensation(context, err);
              compensatedSteps.push(compStepName);
            } catch (compErr: any) {
              logger.error(
                `[Saga:${this.name}] Compensation failed for step: ${compStepName}`,
                compErr,
                { correlationId }
              );
            }
          }
        }

        status = compensatedSteps.length === completedSteps.length ? 'COMPENSATED' : 'FAILED';
        break;
      }
    }

    if (status === 'RUNNING') {
      status = 'COMPLETED';
    }

    const durationMs = Date.now() - startTime;
    logger.info(`[Saga:${this.name}] Finished with status: ${status} (${durationMs}ms)`, {
      correlationId,
      status,
      completedSteps,
      compensatedSteps,
      durationMs,
    });

    return {
      status,
      context,
      error: failureError,
      completedSteps,
      compensatedSteps,
      durationMs,
    };
  }
}
