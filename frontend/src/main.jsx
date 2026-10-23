import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import './styles.css';
import { AppProviders } from './state.jsx';
import Layout from './components/Layout.jsx';
import RequireRole from './components/RequireRole.jsx';
import { CategoriesPage, CategoryPage, ExplorePage, HomePage } from './pages/Public.jsx';
import { OfferPage, StorePage } from './pages/Detail.jsx';
import { BusinessRegisterPage, LoginPage, RegisterPage, SavedPage } from './pages/Account.jsx';
import { BusinessLayout, OffersTab, StoresTab } from './pages/Business.jsx';
import { AdminLayout, CategoriesAdminPage, ReportsPage, StoreReviewPage } from './pages/Admin.jsx';
import { NotFound } from './ui.jsx';

// Routes follow the specification's URL map. Pages for later phases are added with
// their features, so navigation never links to an unfinished page.
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/explore', element: <ExplorePage /> },
      { path: '/nearby', element: <ExplorePage nearbyOnly /> },
      { path: '/categories', element: <CategoriesPage /> },
      { path: '/categories/:slug', element: <CategoryPage /> },
      { path: '/offers/:offerId', element: <OfferPage /> },
      { path: '/stores/:storeId', element: <StorePage /> },
      { path: '/auth/login', element: <LoginPage /> },
      { path: '/auth/register', element: <RegisterPage /> },
      { path: '/business/register', element: <BusinessRegisterPage /> },
      { path: '/account', element: <Navigate to="/account/saved" replace /> },
      { path: '/account/saved', element: <RequireRole role="CUSTOMER"><SavedPage /></RequireRole> },
      {
        path: '/business',
        element: <RequireRole role="VENDOR"><BusinessLayout /></RequireRole>,
        children: [
          { index: true, element: <Navigate to="/business/offers" replace /> },
          { path: 'offers', element: <OffersTab /> },
          { path: 'stores', element: <StoresTab /> },
        ],
      },
      {
        path: '/admin',
        element: <RequireRole role="ADMIN"><AdminLayout /></RequireRole>,
        children: [
          { index: true, element: <Navigate to="/admin/vendors" replace /> },
          { path: 'vendors', element: <StoreReviewPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'categories', element: <CategoriesAdminPage /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </React.StrictMode>,
);
