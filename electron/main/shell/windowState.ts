export interface WindowState {
  width: number;
  height: number;
}

export function getWindowState(): WindowState {
  return {
    width: 1440,
    height: 900
  };
}
