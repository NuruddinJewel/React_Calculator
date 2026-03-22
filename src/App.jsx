import { useState, useEffect, useCallback } from 'react'
import './App.css'

const BUTTONS = [
  { label: 'AC',  type: 'clear',   style: 'func' },
  { label: '+/-', type: 'sign',    style: 'func' },
  { label: '%',   type: 'percent', style: 'func' },
  { label: '÷',   type: 'op',  value: '/', style: 'op' },
  { label: '7',   type: 'num', value: '7', style: 'num' },
  { label: '8',   type: 'num', value: '8', style: 'num' },
  { label: '9',   type: 'num', value: '9', style: 'num' },
  { label: '×',   type: 'op',  value: '*', style: 'op' },
  { label: '4',   type: 'num', value: '4', style: 'num' },
  { label: '5',   type: 'num', value: '5', style: 'num' },
  { label: '6',   type: 'num', value: '6', style: 'num' },
  { label: '−',   type: 'op',  value: '-', style: 'op' },
  { label: '1',   type: 'num', value: '1', style: 'num' },
  { label: '2',   type: 'num', value: '2', style: 'num' },
  { label: '3',   type: 'num', value: '3', style: 'num' },
  { label: '+',   type: 'op',  value: '+', style: 'op' },
  { label: '⌫',   type: 'back',   style: 'func' },
  { label: '0',   type: 'num', value: '0', style: 'num' },
  { label: '.',   type: 'dot',     style: 'num' },
  { label: '=',   type: 'eq',      style: 'eq' },
]

export default function App() {
  // Single source of truth — no derived display state
  const [expression, setExpression] = useState('')
  const [display, setDisplay]       = useState('0')
  const [, setEvaluated]   = useState(false)
  const [activeKey, setActiveKey]   = useState(null)
  const [rippleKey, setRippleKey]   = useState(null)

  const flash = useCallback((key) => {
    setActiveKey(key)
    setRippleKey(Date.now())
    setTimeout(() => setActiveKey(null), 150)
  }, [])

  // ── Core handlers (no nested setState inside setState) ──────────────────

  const handleNum = useCallback((v) => {
    flash(v)
    setEvaluated(prev => {
      if (prev) {
        setExpression(v)
        setDisplay(v)
        return false
      }
      setExpression(ex => {
        const next = ex + v
        setDisplay(d => d === '0' ? v : d + v)
        return next
      })
      return false
    })
  }, [flash])

  const handleOp = useCallback((op) => {
    flash(op)
    const OPS = ['+', '-', '*', '/']
    setEvaluated(false)
    setExpression(ex => {
      const next = OPS.includes(ex.slice(-1))
        ? ex.slice(0, -1) + op
        : ex + op
      setDisplay(next)
      return next
    })
  }, [flash])

  const handleDot = useCallback(() => {
    flash('.')
    setEvaluated(prev => {
      if (prev) {
        setExpression('0.')
        setDisplay('0.')
        return false
      }
      setExpression(ex => {
        const parts = ex.split(/[+\-*/]/)
        const last  = parts[parts.length - 1]
        if (last.includes('.')) return ex
        const next = ex + '.'
        setDisplay(d => d + '.')
        return next
      })
      return false
    })
  }, [flash])

  const handleClear = useCallback(() => {
    flash('AC')
    setDisplay('0')
    setExpression('')
    setEvaluated(false)
  }, [flash])

  const handleBack = useCallback(() => {
    flash('⌫')
    setEvaluated(prev => {
      if (prev) {
        setDisplay('0'); setExpression(''); return false
      }
      setExpression(ex => {
        const next = ex.length <= 1 ? '' : ex.slice(0, -1)
        setDisplay(next === '' ? '0' : next)
        return next
      })
      return false
    })
  }, [flash])

  const handleEquals = useCallback(() => {
    flash('=')
    setExpression(ex => {
      if (!ex) return ex
      try {
        // eslint-disable-next-line no-new-func
        const raw    = Function('"use strict";return(' + ex + ')')()
        const result = String(parseFloat(raw.toFixed(10)))
        setDisplay(result)
        setEvaluated(true)
        return result
      } catch {
        setDisplay('Error')
        setEvaluated(true)
        return ''
      }
    })
  }, [flash])

  const handleSign = useCallback(() => {
    flash('+/-')
    setDisplay(d => {
      if (d === '0' || d === 'Error') return d
      const next = d.startsWith('-') ? d.slice(1) : '-' + d
      setExpression(next)
      return next
    })
  }, [flash])

  const handlePercent = useCallback(() => {
    flash('%')
    setExpression(ex => {
      try {
        // eslint-disable-next-line no-new-func
        const raw    = Function('"use strict";return(' + ex + ')')()
        const result = String(parseFloat((raw / 100).toFixed(10)))
        setDisplay(result)
        setEvaluated(true)
        return result
      } catch { return ex }
    })
  }, [flash])

  // ── Keyboard listener ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key >= '0' && e.key <= '9') handleNum(e.key)
      else if (e.key === '+')           handleOp('+')
      else if (e.key === '-')           handleOp('-')
      else if (e.key === '*')           handleOp('*')
      else if (e.key === '/') { e.preventDefault(); handleOp('/') }
      else if (e.key === '.')           handleDot()
      else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); handleEquals() }
      else if (e.key === 'Backspace')   handleBack()
      else if (e.key === 'Escape')      handleClear()
      else if (e.key === '%')           handlePercent()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleNum, handleOp, handleDot, handleEquals, handleBack, handleClear, handlePercent])

  // ── UI helpers ──────────────────────────────────────────────────────────
  const OP_MAP = { '/': '÷', '*': '×', '-': '−' }

  const isPressed = (btn) => {
    const id = btn.value || btn.label
    return activeKey === id || activeKey === OP_MAP[id]
  }

  const styleMap = {
    func: 'bg-slate-600 hover:bg-slate-500 text-white',
    op:   'bg-amber-400 hover:bg-amber-300 text-slate-900',
    num:  'bg-slate-700 hover:bg-slate-600 text-white',
    eq:   'bg-amber-400 hover:bg-amber-300 text-slate-900',
  }

  const dispatch = (btn) => {
    if      (btn.type === 'num')     handleNum(btn.value)
    else if (btn.type === 'op')      handleOp(btn.value)
    else if (btn.type === 'dot')     handleDot()
    else if (btn.type === 'clear')   handleClear()
    else if (btn.type === 'back')    handleBack()
    else if (btn.type === 'eq')      handleEquals()
    else if (btn.type === 'sign')    handleSign()
    else if (btn.type === 'percent') handlePercent()
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap');
        * { font-family: 'Outfit', sans-serif; box-sizing: border-box; }

        body {
          background: radial-gradient(ellipse at 20% 50%, #1e1b4b 0%, #0f172a 40%, #020617 100%);
          min-height: 100vh;
        }

        .calc-wrap {
          background: linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.01));
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.05),
            0 40px 80px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.1);
        }

        .display-wrap {
          background: linear-gradient(135deg, rgba(0,0,0,0.5), rgba(0,0,0,0.3));
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: inset 0 4px 20px rgba(0,0,0,0.4);
        }

        .display-num {
          background: linear-gradient(180deg, #ffffff 0%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 20px rgba(165,180,252,0.4));
          font-weight: 300;
          letter-spacing: -2px;
        }

        .btn-calc {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          height: 64px;
          font-size: 1.25rem;
          font-weight: 400;
          cursor: pointer;
          transition: transform 0.1s ease, box-shadow 0.1s ease, filter 0.1s ease;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15);
        }

        .btn-calc:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
        }

        .btn-calc:active, .btn-calc.pressed {
          transform: translateY(1px) scale(0.97);
          box-shadow: 0 2px 6px rgba(0,0,0,0.3), inset 0 2px 4px rgba(0,0,0,0.3);
          filter: brightness(1.3);
        }

        .ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.25);
          width: 140%;
          aspect-ratio: 1;
          top: 50%; left: 50%;
          transform: translate(-50%,-50%) scale(0);
          animation: ripple-anim 0.5s ease-out forwards;
          pointer-events: none;
        }
        @keyframes ripple-anim {
          to { transform: translate(-50%,-50%) scale(1); opacity: 0; }
        }

        .expr-text {
          color: rgba(165,180,252,0.5);
          font-size: 0.85rem;
          letter-spacing: 0.5px;
          min-height: 20px;
        }

        .glow-dot {
          width: 6px; height: 6px;
          background: #a5b4fc;
          border-radius: 50%;
          box-shadow: 0 0 8px #a5b4fc, 0 0 20px #a5b4fc;
          animation: pulse-dot 2s infinite;
        }
        @keyframes pulse-dot {
          0%,100% { opacity: 1; } 50% { opacity: 0.3; }
        }

        .kbd-hint {
          color: rgba(148,163,184,0.4);
          font-size: 0.7rem;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
      `}</style>

      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="glow-dot" />
          <span className="kbd-hint">keyboard supported</span>
          <div className="glow-dot" />
        </div>

        <div className="calc-wrap rounded-3xl p-5 w-80">
          {/* Display */}
          <div className="display-wrap rounded-2xl px-5 pt-4 pb-5 mb-4">
            <p className="expr-text truncate text-right mb-1">
              {expression || '\u00a0'}
            </p>
            <p className={`display-num text-right leading-none transition-all duration-150 ${
              display.length > 9 ? 'text-3xl' : display.length > 6 ? 'text-4xl' : 'text-5xl'
            }`}>
              {display}
            </p>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-4 gap-2.5">
            {BUTTONS.map((btn) => {
              const pressed = isPressed(btn)
              return (
                <button
                  key={btn.label}
                  onClick={() => dispatch(btn)}
                  className={`btn-calc ${styleMap[btn.style]} ${pressed ? 'pressed' : ''}`}
                >
                  {pressed && <span className="ripple" key={rippleKey} />}
                  {btn.label}
                </button>
              )
            })}
          </div>
        </div>

        <p className="kbd-hint mt-5">esc to clear · backspace to delete</p>
      </div>
    </>
  )
}