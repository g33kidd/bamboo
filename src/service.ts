export function service<T>(name: string, instance: T): Service<T> {
  return new Service<T>(name, instance)
}

export default class Service<T> {
  name: string
  instance: T

  constructor(name: string, instance: T) {
    this.name = name
    this.instance = instance
  }
}
