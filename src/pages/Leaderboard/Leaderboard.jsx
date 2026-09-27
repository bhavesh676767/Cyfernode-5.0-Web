import { useEffect, useState, useCallback } from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Preloader } from '@/components/Preloader'
import { supabase } from '@/lib/supabaseBrowser'
import styles from './Leaderboard.module.css'

// ─── helpers ──────────────────────────────────────────────────────────────────
function formatTimestamp(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Kolkata',
    hour12: true,
  })
}

function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  })
}

function elapsed(ts) {
  if (!ts) return null
  const ms = Date.now() - new Date(ts).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

function countLevels(levels) {
  if (Array.isArray(levels)) return levels.length
  return Number.isFinite(Number(levels)) ? Number(levels) : 0
}

// ─── main component ───────────────────────────────────────────────────────────
export function Leaderboard() {
  useDocumentTitle('Leaderboard · Clue-Less')

  const [loading, setLoading]   = useState(true)
  const [rows, setRows]         = useState([])
  const [lastRefresh, setLastRefresh] = useState(null)
  const [error, setError]       = useState(null)
  const [highlight, setHighlight] = useState(null)
  const [tick, setTick]         = useState(0)
  // ── fetch leaderboard ────────────────────────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const lbRes = await supabase
        .from('clue_less_teams')
        .select('school_code,school_name,score,levels_completed,current_level,last_active_at,updated_at')
        .order('score', { ascending: false })
        .order('last_active_at', { ascending: false, nullsFirst: false })

      if (lbRes.error) throw lbRes.error
      setRows((lbRes.data || []).map((team) => ({
        ...team,
        levels_solved: countLevels(team.levels_completed),
        last_solve_time: team.last_active_at,
      })))
      setLastRefresh(new Date())
      setError(null)
    } catch (err) {
      console.error('[Leaderboard] fetch error:', err)
      setError('Could not load leaderboard data.')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── initial load + realtime subscription ────────────────────────────────────
  useEffect(() => {
    fetchData()

    const ch = supabase
      .channel('leaderboard-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clue_less_teams' },
        (payload) => {
          const code = payload.new?.school_code || payload.old?.school_code
          if (code) {
            setHighlight(code)
            setTimeout(() => setHighlight(null), 2500)
          }
          fetchData(true)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [fetchData])

  // ── tick every 30 s so "X min ago" stays fresh ──────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  // ── preloader ─────────────────────────────────────────────────────────────
  if (loading) return <Preloader loading />

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* ── header ── */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>Clue-Less</h1>
            <p className={styles.subtitle}>Live Leaderboard · Wave 2</p>
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.live}>
              <span className={styles.liveDot} />
              LIVE
            </span>
            <button className={styles.refreshBtn} onClick={() => fetchData(true)} title="Refresh">
              ↻
            </button>
          </div>
        </div>

        {lastRefresh && (
          <p className={styles.refreshTime}>
            Last updated {formatDate(lastRefresh)} at {formatTimestamp(lastRefresh)} IST
          </p>
        )}

        {error && <p className={styles.error}>{error}</p>}
      </div>

      {/* ── main table ── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thRank}>#</th>
              <th className={styles.thSchool}>School / Team</th>
              <th className={styles.thScore}>Score</th>
              <th className={styles.thLevels}>Levels</th>
              <th className={styles.thTime}>Last Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const rank  = idx + 1
              const isNew = highlight === row.school_code

              return (
                <tr
                  key={row.school_code}
                  className={[
                    styles.tr,
                    rank === 1 ? styles.trFirst : '',
                    rank === 2 ? styles.trSecond : '',
                    rank === 3 ? styles.trThird : '',
                    isNew      ? styles.trHighlight : '',
                  ].join(' ')}
                >
                  {/* Rank */}
                  <td className={styles.tdRank}>
                    <span className={styles.rankNum}>{rank}</span>
                  </td>

                  {/* School */}
                  <td className={styles.tdSchool}>
                    <span className={styles.schoolName}>{row.school_name}</span>
                    <span className={styles.schoolCode}>{row.school_code}</span>
                  </td>

                  {/* Score */}
                  <td className={styles.tdScore}>
                    <span className={styles.scoreVal}>{Number(row.score || 0).toLocaleString()}</span>
                    <span className={styles.scorePts}>pts</span>
                  </td>

                  {/* Levels solved */}
                  <td className={styles.tdLevels}>{row.levels_solved}</td>

                  {/* Last solve time */}
                  <td className={styles.tdTime}>
                    {row.last_solve_time ? (
                      <>
                        <span className={styles.timeVal}>{formatTimestamp(row.last_solve_time)}</span>
                        <span className={styles.timeAgo}>{elapsed(row.last_solve_time)}</span>
                      </>
                    ) : (
                      <span className={styles.noTime}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  No scores recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
