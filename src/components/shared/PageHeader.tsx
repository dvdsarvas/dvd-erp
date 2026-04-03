import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/animations'

interface PageHeaderProps {
  naslov: string
  opis?: string
  akcije?: React.ReactNode
}

export function PageHeader({ naslov, opis, akcije }: PageHeaderProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="flex items-center justify-between mb-6"
    >
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {naslov}
        </h1>
        {opis && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {opis}
          </p>
        )}
      </div>
      {akcije && <div className="flex items-center gap-2">{akcije}</div>}
    </motion.div>
  )
}
