/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  // Main documentation sidebar
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/quick-start',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/agent-development',
        {
          type: 'category',
          label: 'Advanced Guides',
          items: [
            'guides/advanced/zk-compression',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'SDK Reference',
      items: [
        'sdk/typescript',
        {
          type: 'category',
          label: 'MCP Server',
          items: [
            'sdk/mcp-server/overview',
          ],
        },
        {
          type: 'category',
          label: 'Eliza Plugin',
          items: [
            'sdk/plugin/overview',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api-reference/rest-api',
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      items: [
        'examples/trading-bot',
        'examples/multi-agent',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/github-pages',
      ],
    },
    {
      type: 'category',
      label: 'Resources',
      items: [
        'resources/troubleshooting',
      ],
    },
  ],

  // But you can create a sidebar manually
  /*
  tutorialSidebar: [
    'intro',
    'hello',
    {
      type: 'category',
      label: 'Tutorial',
      items: ['tutorial-basics/create-a-document'],
    },
  ],
   */
};

export default sidebars; 