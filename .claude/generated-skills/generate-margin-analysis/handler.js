// generate-margin-analysis — AnythingLLM Custom Agent Skill
// Generates multi-sheet Excel margin analysis for ANC LED display projects
// Calls the ANC Proposal Engine API to create the workbook and returns a download link

module.exports.runtime = {
  handler: async function ({ project_data_json }) {
    try {
      // ── Validate Input ──────────────────────────────────────────────────

      if (!project_data_json || project_data_json === "{}") {
        return "Error: No project data provided. Complete all phases of the estimation before generating the Excel. The project_data_json parameter must contain the full project data object.";
      }

      // Parse and validate the JSON
      let projectData;
      try {
        projectData =
          typeof project_data_json === "string"
            ? JSON.parse(project_data_json)
            : project_data_json;
      } catch (parseErr) {
        return `Error: Invalid JSON in project_data_json — ${parseErr.message}`;
      }

      if (!projectData.project_name) {
        return "Error: project_data_json is missing 'project_name'. Cannot generate Excel without a project name.";
      }

      if (
        !projectData.displays ||
        !Array.isArray(projectData.displays) ||
        projectData.displays.length === 0
      ) {
        return "Error: project_data_json is missing 'displays' array. At least one display group is required.";
      }

      // Validate each display has required fields
      for (const display of projectData.displays) {
        if (!display.name || display.cost === undefined || display.selling_price === undefined) {
          return `Error: Display "${display.name || "unnamed"}" is missing required fields (name, cost, selling_price).`;
        }
      }

      this.introspect(
        `Generating Excel for "${projectData.project_name}" — ${projectData.displays.length} display group(s)...`
      );

      // ── Call ANC API ────────────────────────────────────────────────────

      const baseUrl =
        this.runtimeArgs["ANC_API_URL"] ||
        "https://basheer-therag2.prd42b.easypanel.host";
      const apiKey = this.runtimeArgs["ANC_API_KEY"] || "";

      const apiUrl = `${baseUrl}/api/intelligence/generate-excel`;

      this.introspect(`Calling ANC API: ${apiUrl}`);

      const headers = {
        "Content-Type": "application/json",
      };
      if (apiKey) {
        headers["x-api-key"] = apiKey;
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ project_data_json: JSON.stringify(projectData) }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger(
          "generate-margin-analysis",
          `API error ${response.status}: ${errorText}`
        );
        return `Error generating Excel: API returned ${response.status} — ${errorText}`;
      }

      const result = await response.json();

      if (!result.success || !result.download_url) {
        return `Error: API did not return a download URL. Response: ${JSON.stringify(result)}`;
      }

      // ── Return Download Link ────────────────────────────────────────────

      const fullDownloadUrl = `${baseUrl}${result.download_url}`;

      this.introspect(`Excel generated successfully: ${result.filename}`);

      // Build a clean response with the download link
      const displaySummary = projectData.displays
        .map(
          (d) =>
            `  • ${d.name}: Cost $${d.cost.toLocaleString()} → Selling $${d.selling_price.toLocaleString()} (${d.margin_pct}% margin)`
        )
        .join("\n");

      return [
        `✅ **Margin Analysis Excel Generated**`,
        ``,
        `**Project:** ${projectData.project_name}`,
        `**Date:** ${projectData.date || "N/A"}`,
        `**Type:** ${projectData.estimate_type || "N/A"}`,
        ``,
        `**Displays:**`,
        displaySummary,
        ``,
        `**Grand Total:** Cost $${(projectData.grand_total_cost || 0).toLocaleString()} → Selling $${(projectData.grand_total_selling || 0).toLocaleString()} (${projectData.grand_total_margin_pct || 0}% margin)`,
        ``,
        `📥 **Download:** ${fullDownloadUrl}`,
        ``,
        `File: ${result.filename}`,
        `Link expires in ${result.expires_in || "1 hour"}.`,
      ].join("\n");
    } catch (e) {
      this.introspect(`Skill failed: ${e.message}`);
      this.logger("generate-margin-analysis", `Fatal error: ${e.message}`);
      return `Skill failed: ${e.message}`;
    }
  },
};
