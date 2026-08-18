import { Route, Routes } from 'react-router-dom'
import { PageShell } from '@/components/layout/PageShell'
import { About } from '@/pages/About/About'
import { Contact } from '@/pages/Contact/Contact'
import { Home } from '@/pages/Home/Home'
import { NotFound } from '@/pages/NotFound/NotFound'
import { Projects } from '@/pages/Projects/Projects'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<PageShell />}>
        <Route path="/about" element={<About />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
