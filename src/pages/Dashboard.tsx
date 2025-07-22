import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">CRM Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Klijenti</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Statistike klijenata */}
          </CardContent>
        </Card>
        {/* Ostale kartice */}
      </div>
    </div>
  );
}