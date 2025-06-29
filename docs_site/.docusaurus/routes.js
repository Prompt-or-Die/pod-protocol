import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/pod-protocol/search',
    component: ComponentCreator('/pod-protocol/search', '54c'),
    exact: true
  },
  {
    path: '/pod-protocol/docs',
    component: ComponentCreator('/pod-protocol/docs', '4a4'),
    routes: [
      {
        path: '/pod-protocol/docs',
        component: ComponentCreator('/pod-protocol/docs', '8a0'),
        routes: [
          {
            path: '/pod-protocol/docs',
            component: ComponentCreator('/pod-protocol/docs', '29c'),
            routes: [
              {
                path: '/pod-protocol/docs/api-reference/rest-api',
                component: ComponentCreator('/pod-protocol/docs/api-reference/rest-api', 'faa'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/pod-protocol/docs/architecture/overview',
                component: ComponentCreator('/pod-protocol/docs/architecture/overview', '766'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/pod-protocol/docs/deployment/github-pages',
                component: ComponentCreator('/pod-protocol/docs/deployment/github-pages', 'e67'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/pod-protocol/docs/examples/multi-agent',
                component: ComponentCreator('/pod-protocol/docs/examples/multi-agent', '8bf'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/pod-protocol/docs/examples/trading-bot',
                component: ComponentCreator('/pod-protocol/docs/examples/trading-bot', '704'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/pod-protocol/docs/getting-started/installation',
                component: ComponentCreator('/pod-protocol/docs/getting-started/installation', '4e9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/pod-protocol/docs/getting-started/quick-start',
                component: ComponentCreator('/pod-protocol/docs/getting-started/quick-start', '01d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/pod-protocol/docs/guides/advanced/zk-compression',
                component: ComponentCreator('/pod-protocol/docs/guides/advanced/zk-compression', '008'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/pod-protocol/docs/guides/agent-development',
                component: ComponentCreator('/pod-protocol/docs/guides/agent-development', '467'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/pod-protocol/docs/intro',
                component: ComponentCreator('/pod-protocol/docs/intro', 'c7a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/pod-protocol/docs/resources/troubleshooting',
                component: ComponentCreator('/pod-protocol/docs/resources/troubleshooting', 'e3e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/pod-protocol/docs/sdk/mcp-server/overview',
                component: ComponentCreator('/pod-protocol/docs/sdk/mcp-server/overview', 'e6d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/pod-protocol/docs/sdk/plugin/overview',
                component: ComponentCreator('/pod-protocol/docs/sdk/plugin/overview', 'b6d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/pod-protocol/docs/sdk/typescript',
                component: ComponentCreator('/pod-protocol/docs/sdk/typescript', '1e7'),
                exact: true,
                sidebar: "tutorialSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/pod-protocol/',
    component: ComponentCreator('/pod-protocol/', '401'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
