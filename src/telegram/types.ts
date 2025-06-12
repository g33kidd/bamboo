export interface Machine {
  id: string
  internal?: boolean
  external?: boolean
}

export interface Message {
  machine: string
  payload: any
  time: number
}
