/** Frame measurements establish delivery of the stimulus, never human perception of it. */
export function movementHealth(frames, motion) {
  const end = frames.at(-1);
  if (!end || end.column !== 'doing' || !frames.every(f => Number.isFinite(f.x) && Number.isFinite(f.y) && typeof f.transformed === 'boolean')) return { valid: false, reason: 'Missing destination geometry or transform evidence.' };
  const destination = frames.filter(f => f.column === 'doing');
  const intermediateFrames = destination.filter(f => Math.abs(f.x - end.x) > 1 || Math.abs(f.y - end.y) > 1).length;
  const transformedFrames = destination.filter(f => f.transformed).length;
  return {
    valid: motion === 'normal' ? intermediateFrames >= 2 : motion === 'reduced' && intermediateFrames === 0 && transformedFrames === 0,
    intermediateFrames, transformedFrames, totalFrames: frames.length,
  };
}
