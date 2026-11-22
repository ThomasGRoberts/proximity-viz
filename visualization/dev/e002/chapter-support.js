// A chapter is displayable only when one USA 245 amateur TLE supports its
// entire window. The spreadsheet still supplies all proposed chapter dates.
export function supportedUsa245Chapters(chapters, tles, maxAgeHours) {
  const maxAgeMs = maxAgeHours * 3600000;
  return chapters.filter(chapter => {
    const start = chapter.startMs ?? Date.parse(chapter.start);
    const end = chapter.endMs ?? Date.parse(chapter.end);
    return tles.some(tle => {
      const epoch = Date.parse(tle.epoch);
      return Number.isFinite(epoch) && Math.max(Math.abs(start - epoch), Math.abs(end - epoch)) <= maxAgeMs;
    });
  });
}
