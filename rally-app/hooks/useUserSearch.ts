import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchUsers } from '@/lib/users/userSearchService'

const DEBOUNCE_MS = 220

export function useDebouncedValue<T>(value: T, delay = DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export function useUserSearch(query: string) {
  const searchedQuery = useDebouncedValue(query).trim()
  const queryResult = useQuery({
    queryKey: ['user-search', searchedQuery],
    queryFn: () => searchUsers(searchedQuery),
    enabled: searchedQuery.length >= 1,
    staleTime: 30_000,
  })

  return { ...queryResult, searchedQuery }
}
