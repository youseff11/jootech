import { Suspense, lazy, useEffect } from 'react'
import { usePath, scrollToId } from './lib/router'
import { useProjects } from './lib/hooks'
import Nav from './components/Nav'
import Hero from './components/Hero'
import Marquee from './components/Marquee'
import Work from './components/Work'
import { Services, Process } from './components/Services'
import Contact from './components/Contact'
import Footer from './components/Footer'
import Starfield from './components/Starfield'

const ProjectPage = lazy(() => import('./pages/ProjectPage'))
// the dashboard is its own chunk — visitors never download it
const Dashboard = lazy(() => import('./dashboard/Dashboard'))

export default function App() {
  const path = usePath()
  if (path === '/dashboard' || path.startsWith('/dashboard/')) {
    return (
      <Suspense fallback={<div className="dash-loading" />}>
        <Dashboard path={path} />
      </Suspense>
    )
  }
  return <Site path={path} />
}

function Site({ path }) {
  const data = useProjects()

  // on first load with a #hash, jump to the section once it exists
  useEffect(() => {
    if (location.hash) setTimeout(() => scrollToId(location.hash.slice(1)), 80)
  }, [])

  const match = path.match(/^\/projects\/(\d+)\/?$/)

  return (
    <>
      <div className="bg" aria-hidden="true">
        <div className="bg__grid" />
        <div className="bg__orb bg__orb--a" />
        <div className="bg__orb bg__orb--b" />
        <Starfield />
      </div>

      <Nav path={path} />

      {match ? (
        <Suspense fallback={<main className="page" />}>
          <ProjectPage id={match[1]} {...data} />
        </Suspense>
      ) : (
        <main>
          <Hero projectCount={data.data?.count ?? data.projects.length} hero={data.data?.site?.hero} />
          <Marquee />
          <Work {...data} />
          <Services />
          <Process />
          <Contact />
        </main>
      )}

      <Footer />
    </>
  )
}
