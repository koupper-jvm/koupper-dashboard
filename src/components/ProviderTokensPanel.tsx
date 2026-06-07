import type { TokenMetrics } from '../types/api'

interface Props {
  tokens: TokenMetrics
}

function fmtTokens(n: number): string {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

const PROVIDER_COLORS: Record<string, string> = {
  ollama : 'var(--green)',
  groq   : 'var(--purple)',
  lan    : 'var(--cyan)',
  openai : 'var(--yellow)',
}

function colorFor(label: string): string {
  const key = label.toLowerCase().split(' ')[0]
  return PROVIDER_COLORS[key] ?? 'var(--muted)'
}

export function ProviderTokensPanel({ tokens }: Props) {
  const { byProvider, total } = tokens
  if (!byProvider.length) return null

  return (
    <div className="provider-tokens-panel">
      <div className="pt-header">
        <span className="pt-title">Tokens by provider</span>
        <span className="pt-total" title={`${total.in.toLocaleString()} in / ${total.out.toLocaleString()} out`}>
          {fmtTokens(total.total)} total
        </span>
      </div>
      <table className="pt-table">
        <thead>
          <tr>
            <th>Provider</th>
            <th title="Prompt / input tokens">In</th>
            <th title="Completion / output tokens">Out</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {byProvider.map(row => {
            const pct = total.total > 0 ? (row.total / total.total) * 100 : 0
            return (
              <tr key={row.provider}>
                <td>
                  <span className="pt-dot" style={{ background: colorFor(row.provider) }} />
                  <span className="pt-name">{row.provider}</span>
                </td>
                <td className="pt-num">{fmtTokens(row.in)}</td>
                <td className="pt-num">{fmtTokens(row.out)}</td>
                <td className="pt-num">
                  <span style={{ color: colorFor(row.provider) }}>{fmtTokens(row.total)}</span>
                  <div className="pt-bar-wrap">
                    <div className="pt-bar" style={{ width: `${pct}%`, background: colorFor(row.provider) }} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
