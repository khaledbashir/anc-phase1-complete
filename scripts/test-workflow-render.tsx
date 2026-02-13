
import React from 'react';
import { renderToString } from 'react-dom/server';
import App from '../app/components/workflow/ANCWorkflowDashboard';

try {
    console.log('Attempting to render ANCWorkflowDashboard...');
    const html = renderToString(<App />);
    console.log('Successfully rendered ANCWorkflowDashboard!');
    console.log('Length of HTML:', html.length);
} catch (error) {
    console.error('Failed to render ANCWorkflowDashboard:', error);
    process.exit(1);
}
