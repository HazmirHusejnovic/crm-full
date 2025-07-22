// ... postojeći imports ...

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      {/* Your routes here */}
    </Route>
  ),
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }
  }
);

// ... ostatak koda ...