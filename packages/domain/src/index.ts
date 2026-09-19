export { DomainError, isDomainError, type DomainErrorCode } from './errors'
export {
  ORGANIZATION_ROLES,
  PERMISSIONS,
  assertPermission,
  hasPermission,
  type OrganizationRole,
  type Permission,
} from './organizations/roles'
export {
  EVENT_STATUSES,
  allowedEventTransitions,
  assertEnrollmentSchedule,
  assertEventTransition,
  isEnrollmentOpen,
  type EnrollmentSchedule,
  type EventStatus,
} from './events/event-lifecycle'
export {
  MAX_CAPACITY,
  assertInventoryInvariant,
  assertValidCapacity,
  isSoldOut,
  planCapacityChange,
  seatsAvailable,
  type CapacityChangeInput,
  type CapacityChangePlan,
  type InventorySnapshot,
} from './inventory/inventory'
export {
  REGISTRATION_STATUSES,
  assertRegistrationTransition,
  canTransitionRegistration,
  isActiveRegistration,
  type RegistrationOrigin,
  type RegistrationStatus,
} from './registration/registration-status'
export {
  decideCancellation,
  decideRegistration,
  type CancellationContext,
  type CancellationDecision,
  type RegistrationContext,
  type RegistrationDecision,
} from './registration/registration-policy'
