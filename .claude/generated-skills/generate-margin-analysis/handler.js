// generate-margin-analysis — AnythingLLM Custom Agent Skill
// Generates multi-sheet Excel margin analysis for ANC LED display projects

module.exports.runtime = {
  handler: async function ({ project_data_json }) {
    try {
      if (!project_data_json || project_data_json === "{}") {
        return "Error: No project data provided. The project_data_json parameter must contain the full project data object with project_name and displays array.";
      }

      let projectData;
      try {
        projectData = typeof project_data_json === "string"
          ? JSON.parse(project_data_json)
          : project_data_json;
      } catch (parseErr) {
        return `Error: Invalid JSON in project_data_json — ${parseErr.message}`;
      }

      if (!projectData.project_name) {
        return "Error: project_data_json is missing 'project_name'.";
      }

      if (!projectData.displays || !Array.isArray(projectData.displays) || projectData.displays.length === 0) {
        return "Error: project_data_json is missing 'displays' array. At least one display group is required.";
      }

      this.introspect(
        `Generating margin analysis for "${projectData.project_name}" — ${projectData.displays.length} display group(s)...`
      );

      const baseUrl = this.runtimeArgs["ANC_API_URL"] || "https://basheer-therag2.prd42b.easypanel.host";

      // The /api/intelligence/generate-excel endpoint is not yet available.
      // Provide the data summary and guide the user to the web interface.
      const displaySummary = projectData.displays
        .map((d) =>
          `  - ${d.name}: Cost $${(d.cost || 0).toLocaleString()} | Selling $${(d.selling_price || 0).toLocaleString()} (${d.margin_pct || "N/A"}% margin)`
        )
        .join("\n");

      let output = `**Margin Analysis Summary — ${projectData.project_name}**\n\n`;
      output += `**Displays:**\n${displaySummary}\n\n`;

      if (projectData.grand_total_cost || projectData.grand_total_selling) {
        output += `**Grand Total:**\n`;
        output += `- Cost: $${(projectData.grand_total_cost || 0).toLocaleString()}\n`;
        output += `- Selling: $${(projectData.grand_total_selling || 0).toLocaleString()}\n`;
        output += `- Margin: ${projectData.grand_total_margin_pct || "N/A"}%\n\n`;
      }

      output += `**To generate the Excel workbook:**\n`;
      output += `1. Go to ${baseUrl}/projects\n`;
      output += `2. Open or create the project\n`;
      output += `3. Use Intelligence Mode to build the margin analysis\n`;
      output += `4. Export to Excel from the proposal editor\n\n`;

      output += `Note: Direct Excel generation via API is coming in a future update.`;

      return output;
    } catch (e) {
      this.introspect(`Skill failed: ${e.message}`);
      this.logger("generate-margin-analysis", `Fatal error: ${e.message}`);
      return `Skill failed: ${e.message}`;
    }
  },
};
