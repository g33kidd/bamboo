export interface Machine {
  id: string
}

export interface Message {
  machine: string
  payload: any
  time: number
}
