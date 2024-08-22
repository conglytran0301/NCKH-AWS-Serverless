'use client'

/**
 * Inspired by: https://framer.university/resources/like-button-component
 */
import { Separator } from '@tszhong0411/ui'
import { motion } from 'framer-motion'
import { useRef, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'

import { api } from '@/trpc/react'

type LikeButtonProps = {
  slug: string
}

const LikeButton = (props: LikeButtonProps) => {
  const { slug } = props
  const [cacheCount, setCacheCount] = useState(0)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const utils = api.useUtils()

  const queryKey = { slug }

  const { status, data } = api.likes.get.useQuery(queryKey)
  const likesMutation = api.likes.patch.useMutation({
    onMutate: async (newData) => {
      await utils.likes.get.cancel(queryKey)

      const previousData = utils.likes.get.getData(queryKey)

      utils.likes.get.setData(queryKey, (old) => {
        if (!old) return old

        return {
          ...old,
          likes: old.likes + newData.value,
          currentUserLikes: old.currentUserLikes + newData.value
        }
      })

      return { previousData }
    },
    onError: (_, __, ctx) => {
      if (ctx?.previousData) {
        utils.likes.get.setData(queryKey, ctx.previousData)
      }
    },
    onSettled: () => utils.likes.get.invalidate()
  })

  const confettiHandler = async () => {
    const { clientWidth, clientHeight } = document.documentElement
    const boundingBox = buttonRef.current?.getBoundingClientRect()

    const targetY = boundingBox?.y ?? 0
    const targetX = boundingBox?.x ?? 0
    const targetWidth = boundingBox?.width ?? 0

    const targetCenterX = targetX + targetWidth / 2
    const confetti = (await import('canvas-confetti')).default

    await confetti({
      zIndex: 999,
      particleCount: 100,
      spread: 100,
      origin: {
        y: targetY / clientHeight,
        x: targetCenterX / clientWidth
      },
      shapes: [confetti.shapeFromText({ text: '❤️', scalar: 2 })]
    })
  }

  const onLikeSaving = useDebouncedCallback((value: number) => {
    likesMutation.mutate({ slug, value })
    setCacheCount(0)
  }, 1000)

  const likeHandler = () => {
    if (status === 'pending' || !data || data.currentUserLikes + cacheCount >= 3) return

    const value = cacheCount === 3 ? cacheCount : cacheCount + 1
    setCacheCount(value)

    if (data.currentUserLikes + cacheCount === 2) {
      void confettiHandler()
    }

    return onLikeSaving(value)
  }

  return (
    <div className='mt-12 flex justify-center'>
      <button
        ref={buttonRef}
        className='flex items-center gap-3 rounded-xl bg-zinc-900 px-4 py-2 text-lg text-white'
        type='button'
        onClick={likeHandler}
        aria-label='Like this post'
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='28'
          height='28'
          viewBox='0 0 24 24'
          strokeWidth='2'
          stroke='#ef4444'
          className='relative overflow-hidden'
          fill='none'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <defs>
            <clipPath id='clip-path'>
              <path d='M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572' />
            </clipPath>
          </defs>
          <path d='M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572' />
          <g clipPath='url(#clip-path)'>
            <motion.rect
              x='0'
              y='0'
              width='24'
              height='24'
              fill='#ef4444'
              initial={{
                y: '100%'
              }}
              animate={{
                y: data ? `${100 - (data.currentUserLikes + cacheCount) * 33}%` : '100%'
              }}
            />
          </g>
        </svg>
        Like
        <Separator orientation='vertical' className='bg-zinc-700' />
        {status === 'pending' ? <div>--</div> : null}
        {status === 'error' ? <div>Error</div> : null}
        {status === 'success' ? <div>{data.likes + cacheCount}</div> : null}
      </button>
    </div>
  )
}

export default LikeButton