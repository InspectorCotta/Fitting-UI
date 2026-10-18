import { useCallback, useEffect, useState } from 'react';
import { tabs, type Tab } from './data';
import type { Workspace } from './Sidebar';

type Route = { workspace: Workspace; tab: Tab; projectId?: string };
const workspaces: Workspace[] = [
  'home',
  'projects',
  'datasets',
  'experiments',
  'models',
  'compute',
];
const slug = (tab: Tab) => tab.toLowerCase().replaceAll(' ', '-');

function readRoute(): Route {
  const [path, query] = window.location.hash.replace(/^#\/?/, '').split('?');
  const [workspace, section] = path.split('/');
  if (workspaces.includes(workspace as Workspace)) {
    return { workspace: workspace as Workspace, tab: 'Overview' };
  }
  return {
    workspace: workspace === 'project' ? 'project' : 'home',
    projectId:
      workspace === 'project' ? new URLSearchParams(query).get('project') || undefined : undefined,
    tab:
      workspace === 'project'
        ? tabs.find((tab) => slug(tab) === section) || 'Overview'
        : 'Overview',
  };
}
function routeHash(route: Route) {
  return route.workspace === 'project'
    ? `#/project/${slug(route.tab)}${route.projectId ? `?project=${encodeURIComponent(route.projectId)}` : ''}`
    : `#/${route.workspace}`;
}

/** Use native browser history so browser chrome, mouse buttons and shortcuts agree. */
export function useWorkspaceNavigation() {
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    function restore() {
      const next = readRoute();
      setRoute((previous) => (routeHash(previous) === routeHash(next) ? previous : next));
    }
    const initial = readRoute();
    if (window.location.hash !== routeHash(initial)) {
      window.history.replaceState(window.history.state, '', routeHash(initial));
    }
    window.addEventListener('popstate', restore);
    window.addEventListener('hashchange', restore);
    return () => {
      window.removeEventListener('popstate', restore);
      window.removeEventListener('hashchange', restore);
    };
  }, []);

  const go = useCallback((next: Route) => {
    const hash = routeHash(next);
    if (window.location.hash !== hash) {
      window.history.pushState(null, '', hash);
    }
    setRoute((previous) => (routeHash(previous) === hash ? previous : next));
  }, []);
  const goToTab = useCallback(
    (tab: Tab, projectId?: string) => go({ workspace: 'project', tab, projectId }),
    [go],
  );
  const goToWorkspace = useCallback(
    (workspace: Workspace) => go({ workspace, tab: 'Overview' }),
    [go],
  );
  return { ...route, goToTab, goToWorkspace };
}
