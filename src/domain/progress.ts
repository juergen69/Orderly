export interface SubStepLike {
  done: boolean;
}

export interface Progress {
  done: number;
  total: number;
  label: string;
}

export function progress(subSteps: SubStepLike[]): Progress {
  const total = subSteps.length;
  const done = subSteps.filter((s) => s.done).length;
  return {
    done,
    total,
    label: `${done}/${total}`,
  };
}
