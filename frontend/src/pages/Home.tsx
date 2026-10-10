import React, { useEffect } from 'react'
import type { PageId } from '@/components/layout/Navbar'

interface HomeProps {
  onNavigate: (page: PageId) => void
}

let unicornScriptPromise: Promise<void> | null = null
let embedFilterInstalled = false

function installEmbedFilter() {
  if (typeof window === 'undefined' || embedFilterInstalled) return

  const originalFetch = window.fetch.bind(window)
  window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const request = args[0]
    const url = request instanceof Request ? request.url : String(request || '')
    const response = await originalFetch(...args)
    if (url.includes('embeds') || url.includes('OMzqyUv6M3kSnv0JeAtC')) {
      try {
        const clone = response.clone()
        const data = await clone.json()
        if (data && Array.isArray(data.history)) {
          data.history = data.history.filter((h: any) => h && h.type !== 'freeLogo' && h.layerType !== 'freeLogo')
        }
        if (data && data.options) {
          data.options.includeLogo = false
          data.options.freePlan = false
        }
        return new Response(JSON.stringify(data), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        })
      } catch {
        return response
      }
    }
    return response
  }
  embedFilterInstalled = true
}

function loadUnicornStudioOnce(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (unicornScriptPromise) return unicornScriptPromise
  installEmbedFilter()

  unicornScriptPromise = new Promise((resolve) => {
    // Remove only a stale Unicorn embed script, never unrelated page scripts.
    const oldScripts = document.querySelectorAll('script[src*="unicornstudio"]')
    oldScripts.forEach((s) => s.remove())

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = '/unicornStudio.umd.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      resolve()
    }
    document.head.appendChild(script)
  })

  return unicornScriptPromise
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  useEffect(() => {
    let isMounted = true

    loadUnicornStudioOnce().then(() => {
      if (!isMounted) return
      const win = window as any
      if (win.UnicornStudio && typeof win.UnicornStudio.init === 'function') {
        try {
          if (typeof win.UnicornStudio.destroy === 'function') {
            try {
              win.UnicornStudio.destroy()
            } catch {
              // Ignore destroy errors
            }
          }
          win.UnicornStudio.init()
        } catch {
          // Keep the rest of the page usable if the decorative canvas fails.
        }
      }
    })

    return () => {
      isMounted = false
      const win = window as any
      if (typeof win.UnicornStudio?.destroy === 'function') {
        try {
          win.UnicornStudio.destroy()
        } catch {
          // The static layout remains available if cleanup fails.
        }
      }
    }
  }, [])

  return (
    <div className="relative flex-1 w-full min-h-[calc(100dvh-3.5rem)] lg:min-h-0 lg:h-full flex items-center justify-end overflow-hidden">
      {/* Background Sisyphus Boulder Animation (Desktop) */}
      <div className="absolute inset-0 w-full h-full hidden lg:block overflow-hidden">
        {/* Sisyphus Boulder WebGL Canvas */}
        <div
          data-us-project="OMzqyUv6M3kSnv0JeAtC"
          aria-hidden="true"
          className="unicorn-container"
          style={{ width: '100%', height: '100%', minHeight: '100%' }}
        />

        {/* Ambient Warm Vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FAF7F2]/40 to-[#FAF7F2] pointer-events-none" />
      </div>

      {/* Hero CTA Content (Right Side - Responsive, wraps gracefully, never clips) */}
      <div className="relative z-10 w-full lg:w-1/2 px-4 sm:px-8 lg:px-12 xl:px-16 lg:pr-[8%] py-8 flex items-center justify-end">
        <div className="w-full max-w-lg lg:ml-auto lg:-translate-x-16 space-y-4">
          {/* Top decorative line */}
          <div className="flex items-center gap-2 opacity-80">
            <div className="w-8 h-px bg-teal-700"></div>
            <span className="text-teal-800 text-xs font-mono tracking-wider font-semibold">SPECIALIST POD · COMMERCE ORCHESTRATION</span>
            <div className="flex-1 h-px bg-stone-300"></div>
          </div>

          {/* Main message */}
          <div className="relative max-w-full">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[44px] xl:text-[48px] font-bold text-stone-900 leading-[1.12] font-mono tracking-tight break-words">
              SPECIALIST POD<br />
              PIPELINE RUNNER.
            </h1>
          </div>

          {/* Description */}
          <div className="relative">
            <p className="text-sm sm:text-base text-stone-700 leading-relaxed font-mono opacity-90">
              Autonomous commerce orchestration: Inbound inspection (Receiving), merchant packing verification (Pack), multimodal returns triage (Returns), and fee claim recovery (Recovery). Prep is omitted; missing inbound defect evidence is treated as silent.
            </p>

            {/* Workflow Stages Badge Pill */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-stone-700">
              <span className="rounded bg-stone-200/80 px-2 py-0.5 font-semibold text-stone-900">Receiving</span>
              <span className="text-stone-400">→</span>
              <span className="rounded bg-stone-200/80 px-2 py-0.5 font-semibold text-stone-900">Pack (MFN)</span>
              <span className="text-stone-400">→</span>
              <span className="rounded bg-stone-200/80 px-2 py-0.5 font-semibold text-stone-900">Returns (Returned)</span>
              <span className="text-stone-400">→</span>
              <span className="rounded bg-stone-200/80 px-2 py-0.5 font-semibold text-stone-900">Recovery</span>
            </div>

            {/* Technical corner accent */}
            <div className="hidden sm:block absolute -left-4 top-1/2 w-3 h-3 border border-teal-700 opacity-60" style={{ transform: 'translateY(-50%)' }}>
              <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-teal-700" style={{ transform: 'translate(-50%, -50%)' }}></div>
            </div>
          </div>

          {/* Exactly Two Main Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('analyze')}
              className="relative px-5 py-2.5 bg-stone-900 text-stone-50 font-mono text-base sm:text-lg border border-stone-900 hover:bg-teal-800 hover:border-teal-800 transition-all duration-200 group cursor-pointer shadow-xs active:scale-98 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
            >
              <span className="hidden sm:block absolute -top-1 -left-1 w-2 h-2 border-t border-l border-teal-400 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              <span className="hidden sm:block absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-teal-400 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              ANALYZE AN ITEM
            </button>

            <button
              type="button"
              onClick={() => onNavigate('agents')}
              className="relative px-5 py-2.5 bg-white border border-stone-400 text-stone-900 font-mono text-base sm:text-lg hover:bg-stone-100 hover:border-stone-900 transition-all duration-200 cursor-pointer shadow-2xs active:scale-98 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
            >
              BROWSE AGENTS
            </button>
          </div>

          {/* Bottom technical notation */}
          <div className="hidden sm:flex items-center gap-2 pt-2 opacity-60">
            <span className="text-teal-800 text-[11px] font-mono font-semibold">4 STAGE AGENTS · 1 SPECIALIST</span>
            <div className="flex-1 h-px bg-stone-300"></div>
            <span className="text-stone-600 text-[11px] font-mono">FLOW: specialist-no-prep-v1</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
