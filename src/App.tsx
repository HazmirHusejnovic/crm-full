import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ChatPage from '@/pages/ChatPage'; // Default import
// ... other imports ...

const router = createBrowserRouter([
  {
    path: '/chat',
    element: <ChatPage /> // Must use default export
  },
  // ... other routes
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;