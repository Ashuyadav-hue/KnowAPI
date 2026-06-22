import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.apiLog.deleteMany({});
  await prisma.apiEndpoint.deleteMany({});
  await prisma.fAQ.deleteMany({});
  await prisma.conceptRelationship.deleteMany({});
  await prisma.concept.deleteMany({});
  await prisma.documentChunk.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.chatSession.deleteMany({});
  await prisma.apiKey.deleteMany({});
  await prisma.user.deleteMany({});

  // Create Default User
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'demo@knowledgeapi.com',
      password: passwordHash,
      name: 'Adarsh Demo',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
    },
  });

  console.log(`Created user: ${user.email}`);

  // Create API Key
  const apiKey = await prisma.apiKey.create({
    data: {
      name: 'Development Key',
      key: 'sk_live_demo123456789',
      userId: user.id,
    },
  });

  console.log('Created API Key for user');

  // --- React Hooks Document ---
  const reactDoc = await prisma.document.create({
    data: {
      name: 'React Hooks Quickstart.pdf',
      path: 'uploads/react_hooks_quickstart.pdf',
      size: 1024 * 15, // 15 KB
      mimeType: 'application/pdf',
      status: 'COMPLETED',
      summary: 'A developer guide outlining the core concepts of React Hooks. It explains how functions components utilize state and lifecycle features without writing classes. The document details useState, useEffect, useContext, and custom hooks with detailed code examples.',
      tags: 'React,Frontend,JavaScript,Web Development',
      userId: user.id,
    },
  });

  // Chunks
  const chunk1 = await prisma.documentChunk.create({
    data: {
      content: 'React Hooks were introduced in React 16.8. They let you use state and other React features without writing a class. Before hooks, state management and lifecycle methods were exclusive to class components, leading to boilerplate and complex refactoring. Hooks solve this by allowing you to extract stateful logic from a component so it can be tested independently and reused.',
      documentId: reactDoc.id,
    },
  });

  const chunk2 = await prisma.documentChunk.create({
    data: {
      content: 'useState is a Hook that lets you add React state to function components. When you call useState, you pass the initial state value as an argument, and it returns a pair: the current state value and a function that lets you update it. Example:\nconst [count, setCount] = useState(0);\nYou can use setCount to update the value, which triggers a re-render of the component.',
      documentId: reactDoc.id,
    },
  });

  const chunk3 = await prisma.documentChunk.create({
    data: {
      content: 'useEffect lets you perform side effects in function components. It serves a similar purpose as componentDidMount, componentDidUpdate, and componentWillUnmount in React classes, but unified into a single API. It takes a callback function and an optional dependency array. If you pass an empty array [], the effect runs only once after mount. If you pass variables, the effect runs whenever those variables change.',
      documentId: reactDoc.id,
    },
  });

  // FAQs
  await prisma.fAQ.createMany({
    data: [
      {
        question: 'What are React Hooks?',
        answer: 'React Hooks are functions that let you "hook into" React state and lifecycle features from function components. They allow stateful logic reuse without restructuring your component hierarchy.',
        documentId: reactDoc.id,
      },
      {
        question: 'How does useState work?',
        answer: 'useState declares a state variable. It returns the current state and a function to update it. Updating the state triggers a re-render of the component.',
        documentId: reactDoc.id,
      },
      {
        question: 'What is the purpose of the dependency array in useEffect?',
        answer: 'The dependency array tells React when to re-run the effect. If omitted, the effect runs after every render. If empty [], it runs once. If it contains variables, it runs when those variables change.',
        documentId: reactDoc.id,
      },
    ],
  });

  // Concepts & relationships
  const cReact = await prisma.concept.create({ data: { name: 'React', description: 'A JavaScript library for building user interfaces.', documentId: reactDoc.id } });
  const cHooks = await prisma.concept.create({ data: { name: 'Hooks', description: 'Functions to use React state and lifecycle from functional components.', documentId: reactDoc.id } });
  const cUseState = await prisma.concept.create({ data: { name: 'useState', description: 'Hook for managing state in functional components.', documentId: reactDoc.id } });
  const cUseEffect = await prisma.concept.create({ data: { name: 'useEffect', description: 'Hook for performing side effects (data fetching, subscriptions, etc.) in components.', documentId: reactDoc.id } });

  await prisma.conceptRelationship.createMany({
    data: [
      { fromId: cReact.id, toId: cHooks.id, type: 'parent-child' },
      { fromId: cHooks.id, toId: cUseState.id, type: 'parent-child' },
      { fromId: cHooks.id, toId: cUseEffect.id, type: 'parent-child' },
    ],
  });

  // Endpoints
  const epReactHooks = await prisma.apiEndpoint.create({
    data: {
      path: '/react/hooks',
      method: 'GET',
      description: 'Get general information about React Hooks, including why they were introduced and how they compare to classes.',
      responseSchema: JSON.stringify({
        summary: 'string',
        concepts: 'array of strings',
        introductionVersion: 'string',
      }),
      documentId: reactDoc.id,
    },
  });

  const epReactUseState = await prisma.apiEndpoint.create({
    data: {
      path: '/react/usestate',
      method: 'GET',
      description: 'Retrieve details, syntax, and examples for the useState Hook.',
      responseSchema: JSON.stringify({
        hook: 'string',
        syntax: 'string',
        example: 'string',
        rules: 'array of strings',
      }),
      documentId: reactDoc.id,
    },
  });

  const epReactUseEffect = await prisma.apiEndpoint.create({
    data: {
      path: '/react/useeffect',
      method: 'GET',
      description: 'Retrieve details, syntax, and dependency array examples for the useEffect Hook.',
      responseSchema: JSON.stringify({
        hook: 'string',
        purpose: 'string',
        syntax: 'string',
        lifecycleEquivalents: 'array of strings',
      }),
      documentId: reactDoc.id,
    },
  });

  // --- SQL Cheatsheet Document ---
  const sqlDoc = await prisma.document.create({
    data: {
      name: 'SQL Fundamentals Cheatsheet.md',
      path: 'uploads/sql_fundamentals_cheatsheet.md',
      size: 1024 * 5, // 5 KB
      mimeType: 'text/markdown',
      status: 'COMPLETED',
      summary: 'A reference guide for structured query language (SQL). Covers core relational database operations including SELECT statements, JOIN types, filtering data, and aggregations using GROUP BY.',
      tags: 'SQL,Database,Backend,Development',
      userId: user.id,
    },
  });

  // Chunks
  await prisma.documentChunk.create({
    data: {
      content: 'SQL (Structured Query Language) is the standard language for relational database management systems. The SELECT statement is used to query data from a database. Filters can be applied using the WHERE clause. Joins combine rows from two or more tables based on a related column between them. The main join types are INNER JOIN, LEFT JOIN, RIGHT JOIN, and FULL JOIN.',
      documentId: sqlDoc.id,
    },
  });

  // FAQs
  await prisma.fAQ.create({
    data: {
      question: 'What does an INNER JOIN do?',
      answer: 'An INNER JOIN selects records that have matching values in both tables. If a row from table A does not have a matching row in table B, it is excluded from the results.',
      documentId: sqlDoc.id,
    },
  });

  // Concepts
  const cSql = await prisma.concept.create({ data: { name: 'SQL', description: 'Structured Query Language for databases.', documentId: sqlDoc.id } });
  const cSelect = await prisma.concept.create({ data: { name: 'SELECT', description: 'Database query statement to fetch data.', documentId: sqlDoc.id } });
  const cJoin = await prisma.concept.create({ data: { name: 'JOIN', description: 'Combine records from multiple tables.', documentId: sqlDoc.id } });

  await prisma.conceptRelationship.createMany({
    data: [
      { fromId: cSql.id, toId: cSelect.id, type: 'parent-child' },
      { fromId: cSql.id, toId: cJoin.id, type: 'parent-child' },
      { fromId: cSelect.id, toId: cJoin.id, type: 'related' },
    ],
  });

  // Endpoint
  const epSqlJoin = await prisma.apiEndpoint.create({
    data: {
      path: '/sql/joins',
      method: 'GET',
      description: 'Get reference documentation for SQL JOIN types, syntax, and visual comparisons.',
      responseSchema: JSON.stringify({
        topic: 'string',
        joinTypes: 'array of objects',
        tips: 'array of strings',
      }),
      documentId: sqlDoc.id,
    },
  });

  // --- Processing Doc (for UI status test) ---
  await prisma.document.create({
    data: {
      name: 'Machine Learning Basics.txt',
      path: 'uploads/ml_basics.txt',
      size: 1024 * 8,
      mimeType: 'text/plain',
      status: 'PROCESSING',
      userId: user.id,
    },
  });

  // --- API Logs for Analytics ---
  // Create beautiful telemetry logs over the past week
  const endpoints = [epReactHooks, epReactUseState, epReactUseEffect, epSqlJoin];
  const ips = ['192.168.1.5', '184.22.109.50', '92.104.30.2', '12.18.232.105'];
  const statusCodes = [200, 200, 200, 200, 200, 200, 200, 400, 404, 500];

  const now = new Date();
  for (let i = 0; i < 60; i++) {
    const randomDaysAgo = Math.floor(Math.random() * 7); // 0-6 days ago
    const logDate = new Date(now.getTime() - randomDaysAgo * 24 * 60 * 60 * 1000 - Math.random() * 12 * 60 * 60 * 1000);
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const ip = ips[Math.floor(Math.random() * ips.length)];
    const statusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)];
    const latency = Math.floor(Math.random() * 350) + 50; // 50ms to 400ms

    await prisma.apiLog.create({
      data: {
        endpointId: endpoint.id,
        path: endpoint.path,
        method: endpoint.method,
        ipAddress: ip,
        statusCode: statusCode,
        latencyMs: latency,
        createdAt: logDate,
      },
    });
  }

  // --- Chat Session ---
  const chatSession = await prisma.chatSession.create({
    data: {
      title: 'React Hooks State & Lifecycle',
      userId: user.id,
    },
  });

  await prisma.chatMessage.createMany({
    data: [
      {
        role: 'user',
        content: 'Explain React hooks and what problems they solve.',
        sessionId: chatSession.id,
        createdAt: new Date(now.getTime() - 10 * 60 * 1000),
      },
      {
        role: 'assistant',
        content: 'React Hooks are functions introduced in React 16.8 that allow you to use state and other React features (like lifecycle methods) inside functional components. \n\nThey solve several key problems:\n1. **Reusing stateful logic**: Previously, sharing logic required complex patterns like render props or high-order components. Hooks let you extract stateful logic to reuse it independently.\n2. **Complex component readability**: Class components often split related logic across multiple lifecycle methods (e.g., event listeners set up in `componentDidMount` and cleaned up in `componentWillUnmount`). Hooks let you group related parts together (using `useEffect`).\n3. **Class boilerplates**: Classes require understanding `this` binding in JS, adding boilerplate constructors, and make code optimization more difficult for bundlers.',
        citations: JSON.stringify([
          { fileName: 'React Hooks Quickstart.pdf', text: 'React Hooks were introduced in React 16.8. They let you use state and other React features without writing a class... extract stateful logic from a component so it can be tested independently and reused.' }
        ]),
        sessionId: chatSession.id,
        createdAt: new Date(now.getTime() - 9 * 60 * 1000),
      },
      {
        role: 'user',
        content: 'How do I add state using hooks?',
        sessionId: chatSession.id,
        createdAt: new Date(now.getTime() - 5 * 60 * 1000),
      },
      {
        role: 'assistant',
        content: 'You can add state to function components using the `useState` hook. \n\nWhen you call `useState`, you pass the initial state value as an argument, and it returns a pair: the current state value, and a function to update it.\n\nExample:\n```javascript\nimport React, { useState } from \'react\';\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div>\n      <p>You clicked {count} times</p>\n      <button onClick={() => setCount(count + 1)}>\n        Click me\n      </button>\n    </div>\n  );\n}\n```',
        citations: JSON.stringify([
          { fileName: 'React Hooks Quickstart.pdf', text: 'useState is a Hook that lets you add React state to function components. When you call useState, you pass the initial state value as an argument, and it returns a pair: the current state value and a function that lets you update it.' }
        ]),
        sessionId: chatSession.id,
        createdAt: new Date(now.getTime() - 4 * 60 * 1000),
      },
    ],
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
