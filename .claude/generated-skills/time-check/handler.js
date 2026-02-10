// Time Check — AnythingLLM Custom Agent Skill
// Returns current date/time, optionally in a specific timezone

module.exports.runtime = {
  handler: async function ({ timezone }) {
    try {
      const tz = timezone || 'UTC';
      this.introspect(`Getting current time${timezone ? ' for ' + timezone : ''}...`);

      const now = new Date();

      // Format options
      const options = {
        timeZone: tz,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      };

      // Get formatted time for requested timezone
      const timeString = now.toLocaleString('en-US', options);

      // Also get UTC for reference
      const utcOptions = { ...options, timeZone: 'UTC' };
      const utcString = now.toLocaleString('en-US', utcOptions);

      // Get server local time
      const localString = now.toString();

      let result = `Current time in ${tz}:\n${timeString}`;

      if (timezone && timezone !== 'UTC') {
        result += `\n\nUTC: ${utcString}`;
      }

      result += `\n\nServer time: ${localString}`;

      return result;
    } catch (e) {
      this.introspect(`Error: ${e.message}`);
      this.logger("Time check error", e.message);
      return `Time check failed: ${e.message}\n\nTry using timezone like 'UTC', 'America/New_York', or 'Europe/London'.`;
    }
  },
};
