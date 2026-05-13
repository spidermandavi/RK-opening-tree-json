import React, { useMemo, useState } from 'react'
import { Download, Copy, Plus, Trash2, GitBranch, FileJson } from 'lucide-react'

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function extractStudyId(url) {
  const match = url.match(/lichess\.org\/study\/([a-zA-Z0-9]+)/i)
  return match ? match[1] : null
}

function cleanPgn(pgn) {
  return pgn
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\d+\.(\.\.)?/g, ' ')
    .replace(/1-0|0-1|1\/2-1\/2|\*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseMoves(pgn) {
  return cleanPgn(pgn)
    .split(' ')
    .filter(Boolean)
    .map((move, index) => ({
      move,
      ply: index + 1,
    }))
}

function createNode(move, index, studyKey, path) {
  return {
    id: `${studyKey}-${path}-${index + 1}`,
    reusableLineId: `${studyKey}-${path}`,
    move: move.move,
    ply: move.ply,
    notes: '',
    comments: [],
    training: {
      strength: null,
      accuracy: null,
      reviewed: false,
    },
    children: [],
  }
}

function buildTree(moves, studyKey) {
  const root = {
    id: `${studyKey}-root`,
    move: 'start',
    children: [],
  }

  let current = root
  let path = ''

  moves.forEach((move, index) => {
    path += `${move.move}-`

    const node = createNode(move, index, studyKey, path)
    current.children.push(node)
    current = node
  })

  return root
}

function sampleJson() {
  return {
    metadata: {
      game: 'Racing Kings',
      version: '1.0',
    },
    studies: [
      {
        studyName: 'rk-mainline',
        studyId: 'abcd1234',
        chapters: [
          {
            reusableLineId: 'rk-mainline-abcd1234',
            tree: {
              id: 'rk-mainline-root',
              move: 'start',
              children: [],
            },
          },
        ],
      },
    ],
  }
}

function Panel({ children }) {
  return (
    <div className='bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl'>
      {children}
    </div>
  )
}

export default function App() {
  const [studyName, setStudyName] = useState('rk-opening-tree')
  const [links, setLinks] = useState([''])
  const [pgn, setPgn] = useState('')
  const [jsonOutput, setJsonOutput] = useState('')
  const [copied, setCopied] = useState(false)

  const validStudies = useMemo(() => {
    return links
      .map((link) => link.trim())
      .filter(Boolean)
      .map((url) => ({
        url,
        id: extractStudyId(url),
      }))
  }, [links])

  function updateLink(index, value) {
    setLinks((prev) => prev.map((item, i) => (i === index ? value : item)))
  }

  function addLink() {
    setLinks((prev) => [...prev, ''])
  }

  function removeLink(index) {
    setLinks((prev) => prev.filter((_, i) => i !== index))
  }

  function generateJson() {
    const moves = parseMoves(pgn)
    const baseSlug = slugify(studyName)

    const studies = validStudies.map((study, index) => {
      const key = `${baseSlug}-${study.id || index}`

      return {
        studyName: key,
        studyId: study.id,
        source: study.url,
        importedAt: new Date().toISOString(),
        chapters: [
          {
            chapterName: 'Imported Line',
            reusableLineId: key,
            comments: [],
            notes: '',
            tree: buildTree(moves, key),
          },
        ],
      }
    })

    const output = {
      metadata: {
        app: 'RK Study Converter',
        version: '1.0',
        createdAt: new Date().toISOString(),
        game: 'Racing Kings',
      },
      studies,
    }

    setJsonOutput(JSON.stringify(output, null, 2))
  }

  async function copyJson() {
    await navigator.clipboard.writeText(jsonOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function saveJson() {
    const blob = new Blob([jsonOutput], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')

    a.href = url
    a.download = `${slugify(studyName)}.json`
    a.click()

    URL.revokeObjectURL(url)
  }

  return (
    <div className='min-h-screen bg-black text-white p-6'>
      <div className='max-w-7xl mx-auto grid lg:grid-cols-2 gap-6'>
        <div className='space-y-6'>
          <Panel>
            <div className='p-6 border-b border-zinc-800'>
              <div className='flex items-center gap-3 mb-4'>
                <div className='p-3 rounded-2xl bg-zinc-800'>
                  <GitBranch className='w-6 h-6' />
                </div>

                <div>
                  <h1 className='text-3xl font-black'>
                    Racing Kings Study Converter
                  </h1>

                  <p className='text-zinc-400'>
                    Convert Lichess studies into reusable JSON opening trees.
                  </p>
                </div>
              </div>

              <input
                value={studyName}
                onChange={(e) => setStudyName(e.target.value)}
                placeholder='rk-main-repertoire'
                className='w-full rounded-2xl bg-zinc-950 border border-zinc-700 px-4 py-3'
              />
            </div>

            <div className='p-6 space-y-6'>
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <h2 className='font-bold text-lg'>Study Links</h2>

                  <button
                    onClick={addLink}
                    className='rounded-2xl bg-white text-black px-4 py-2 font-semibold flex items-center gap-2'
                  >
                    <Plus className='w-4 h-4' />
                    Add
                  </button>
                </div>

                {links.map((link, index) => (
                  <div key={index} className='flex gap-2'>
                    <input
                      value={link}
                      onChange={(e) => updateLink(index, e.target.value)}
                      placeholder='https://lichess.org/study/...'
                      className='w-full rounded-2xl bg-zinc-950 border border-zinc-700 px-4 py-3'
                    />

                    {links.length > 1 && (
                      <button
                        className='rounded-2xl bg-red-600 px-4'
                        onClick={() => removeLink(index)}
                      >
                        <Trash2 className='w-4 h-4' />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className='space-y-3'>
                <h2 className='font-bold text-lg'>PGN / Moves</h2>

                <textarea
                  value={pgn}
                  onChange={(e) => setPgn(e.target.value)}
                  placeholder='1. Nf3 Nc6 2. d4 d5 3. Nc3 Nf6'
                  className='w-full min-h-[240px] rounded-2xl bg-zinc-950 border border-zinc-700 px-4 py-3'
                />
              </div>

              <div className='flex flex-wrap gap-3'>
                <button
                  onClick={generateJson}
                  className='rounded-2xl bg-white text-black px-6 py-4 font-bold flex items-center gap-2'
                >
                  <FileJson className='w-5 h-5' />
                  Generate JSON
                </button>

                <button
                  onClick={copyJson}
                  disabled={!jsonOutput}
                  className='rounded-2xl bg-zinc-800 px-6 py-4 font-bold flex items-center gap-2 disabled:opacity-40'
                >
                  <Copy className='w-5 h-5' />
                  {copied ? 'Copied' : 'Copy'}
                </button>

                <button
                  onClick={saveJson}
                  disabled={!jsonOutput}
                  className='rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-4 font-bold flex items-center gap-2 disabled:opacity-40'
                >
                  <Download className='w-5 h-5' />
                  Save File
                </button>
              </div>
            </div>
          </Panel>
        </div>

        <Panel>
          <div className='p-6 border-b border-zinc-800'>
            <h2 className='text-2xl font-bold'>Generated JSON</h2>
            <p className='text-zinc-400 mt-2'>
              Ready for your Racing Kings training platform.
            </p>
          </div>

          <div className='p-6'>
            <div className='h-[850px] overflow-auto rounded-2xl border border-zinc-800 bg-black p-4'>
              <pre className='text-sm whitespace-pre-wrap text-zinc-200'>
                {jsonOutput || JSON.stringify(sampleJson(), null, 2)}
              </pre>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
