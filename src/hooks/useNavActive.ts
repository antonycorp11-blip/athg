import { useLocation } from 'react-router'

/** Ativo por prefixo de rota, ou exato (incluindo query) quando `exact`. */
export function useNavActive() {
  const { pathname, search } = useLocation()
  return (to: string, exact?: boolean) => {
    const [path, query = ''] = to.split('?')
    if (exact) return pathname === path && search.replace(/^\?/, '') === query
    if (path === '/') return pathname === '/'
    return pathname === path || pathname.startsWith(path + '/')
  }
}
