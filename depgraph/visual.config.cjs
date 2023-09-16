module.exports = {
  ...require("./validate.config.cjs"),
  options: {
    ...{
      moduleSystems: ["cjs", "es6"],
      doNotFollow: ["node_modules", "@type"],
      progress: { type: "cli-feedback", maximumLevel: 60 },
      enhancedResolveOptions: {
        exportsFields: ["exports"],
        conditionNames: ["import"],
      },
      tsConfig: {
        fileName: "./tsconfig.json",
      },
      tsPreCompilationDeps: true,
      parser: "tsc",
      exoticRequireStrings: ["requireJSON"],
      prefix: "../..",
      reporterOptions: {
        markdown: {
          showTitle: true,
          showSummaryHeader: false,
          showRulesSummary: false,
          showDetailsHeader: false,
          collapseDetails: false,
          showFooter: false,
        },
      },
    },
    includeOnly: "^(src|output)/",
    reporterOptions: {
      dot: {
        theme: {
          graph: { splines: "ortho", ranksep: "0.5" },
          modules: [
            {
              criteria: { matchesHighlight: true },
              attributes: {
                fillcolor: "yellow",
                color: "green",
                penwidth: 2,
              },
            },
            {
              criteria: { source: "\\.(js|ts)$" },
              attributes: { color: "transparent" },
            },
            {
              criteria: { source: "\\.json$" },
              attributes: { shape: "cylinder" },
            },
          ],
        },
      },
    },
  },
};
