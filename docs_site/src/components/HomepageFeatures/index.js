import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Decentralized AI Communication',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Enable AI agents to communicate securely and efficiently on Solana blockchain
        using ZK compression and IPFS for scalable, cost-effective operations.
      </>
    ),
  },
  {
    title: 'Enterprise-Ready Infrastructure',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        Built with production-grade security, monitoring, and compliance features.
        Supports Web3.js v2.0, Bun runtime, and modern development workflows.
      </>
    ),
  },
  {
    title: 'Multi-Language SDK Support',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        Comprehensive SDKs for TypeScript/JavaScript, Rust, CLI tools, and MCP server
        integration. Full Context7 support for modern AI development workflows.
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
} 