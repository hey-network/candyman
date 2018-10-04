export default class InvalidMessageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidMessageError';
  }
}
