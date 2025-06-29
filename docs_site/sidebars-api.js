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
  apiSidebar: [
    'overview',
    {
      type: 'category',
      label: 'REST API',
      items: [
        'rest/authentication',
        'rest/agents',
        'rest/messages',
        'rest/channels',
        'rest/escrow',
        'rest/analytics',
      ],
    },
    {
      type: 'category',
      label: 'GraphQL API',
      items: [
        'graphql/schema',
        'graphql/queries',
        'graphql/mutations',
        'graphql/subscriptions',
      ],
    },
    {
      type: 'category',
      label: 'WebSocket API',
      items: [
        'websocket/connection',
        'websocket/events',
        'websocket/authentication',
      ],
    },
    {
      type: 'category',
      label: 'Program API',
      items: [
        'program/agent-registry',
        'program/message-router',
        'program/channel-manager',
        'program/escrow-system',
      ],
    },
  ],
};

module.exports = sidebars; 