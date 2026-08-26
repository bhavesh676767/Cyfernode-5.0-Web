import { Route, Routes } from 'react-router-dom'
import { Home } from '@/pages/Home/Home'

/*
 * Every route other than "/" is served by the Framer document, so React
 * deliberately declares no catch-all: an unmatched path must render nothing
 * rather than cover the Framer page that lives there.
 *
 * "/register" is intentionally absent; it is a standalone document at
 * public/register/index.html, reached by a full page load, not by this router.
 */
export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  )
}
