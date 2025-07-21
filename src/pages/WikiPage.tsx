import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/LoadingSpinner'; // Assuming you have a LoadingSpinner component

const WikiPage: React.FC = () => {
  // This is a placeholder page for the Wiki Module.
  // Future steps will involve fetching and displaying wiki categories and articles,
  // as well as forms for creating/editing them.

  const loading = false; // Set to true when fetching data

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Wiki (Internal Knowledge Base)</h1>

      <Card>
        <CardHeader>
          <CardTitle>Welcome to the Wiki Module!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This is where your internal knowledge base will live.
            You can create categories, add articles with Markdown support, and manage permissions.
          </p>
          <p className="mt-4 text-muted-foreground">
            Future features will include:
            <ul className="list-disc list-inside ml-4 mt-2">
              <li>Markdown support for article content</li>
              <li>Category system for organizing articles</li>
              <li>Searchable articles</li>
              <li>Permission control (Admin-only, Employee-visible, Public)</li>
              <li>Version control (edit history)</li>
            </ul>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WikiPage;