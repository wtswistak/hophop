export interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface LevelGeometry {
  readonly width: number;
  readonly fallY: number;
  readonly spawn: { readonly x: number; readonly y: number };
  readonly platforms: readonly Rectangle[];
}

export interface PlayerInput {
  readonly direction: -1 | 0 | 1;
  readonly jump: boolean;
}

export interface PlayerState {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  grounded: boolean;
  facing: -1 | 1;
}
