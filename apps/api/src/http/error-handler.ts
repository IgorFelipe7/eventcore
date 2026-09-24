import { isDatabaseUnavailable } from '@eventcore/db'
import { isDomainError } from '@eventcore/domain'
import { type FastifyError, type FastifyInstance } from 'fastify'
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from 'fastify-type-provider-zod'
import {
  ProblemError,
  buildProblem,
  problemContext,
  problemFromDomainError,
  sendProblem,
} from './problem'

export const registerErrorHandling = (app: FastifyInstance) => {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const context = problemContext(request)

    if (error instanceof ProblemError) {
      return sendProblem(
        reply,
        buildProblem(error.code, context, error.detail, error.options.errors),
        error.options.retryAfterSeconds,
      )
    }

    if (hasZodFastifySchemaValidationErrors(error)) {
      const errors = error.validation.map((issue) => ({
        path: [error.validationContext, ...issue.instancePath.split('/').filter(Boolean)].join('.'),
        message: issue.message ?? 'Invalid value.',
      }))
      return sendProblem(reply, buildProblem('VALIDATION_FAILED', context, undefined, errors))
    }

    if (isDomainError(error)) {
      return sendProblem(reply, problemFromDomainError(error, context))
    }

    if (error.statusCode === 429) {
      return sendProblem(reply, buildProblem('RATE_LIMITED', context), 60)
    }

    if (
      error.code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE' ||
      error.code === 'FST_ERR_CTP_EMPTY_JSON_BODY'
    ) {
      return sendProblem(reply, buildProblem('VALIDATION_FAILED', context, error.message))
    }

    if (error.statusCode === 413 || error.code === 'FST_ERR_CTP_INVALID_JSON_BODY') {
      return sendProblem(
        reply,
        buildProblem('VALIDATION_FAILED', context, 'The request body is not acceptable.'),
      )
    }

    if (isDatabaseUnavailable(error)) {
      request.log.warn({ err: error, error_code: 'TEMPORARY_UNAVAILABLE' }, 'database unavailable')
      return sendProblem(reply, buildProblem('TEMPORARY_UNAVAILABLE', context), 2)
    }

    if (isResponseSerializationError(error)) {
      request.log.error(
        { err: error, error_code: 'RESPONSE_CONTRACT' },
        'response broke its contract',
      )
      return sendProblem(reply, buildProblem('INTERNAL_ERROR', context))
    }

    request.log.error({ err: error, error_code: 'INTERNAL_ERROR' }, 'unhandled error')
    return sendProblem(reply, buildProblem('INTERNAL_ERROR', context))
  })

  app.setNotFoundHandler((request, reply) =>
    sendProblem(reply, buildProblem('NOT_FOUND', problemContext(request))),
  )
}
