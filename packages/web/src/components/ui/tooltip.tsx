"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

/**
 * 便捷包装:
 *   <Tooltip content="说明文字">
 *     <button>悬停我</button>
 *   </Tooltip>
 *
 * 接口来源:node_modules/@base-ui/.ignored_react/tooltip 下各 .d.ts 核查确认。
 * Trigger 默认渲染 <button>,若 children 本身是可交互元素请传 render prop 穿透:
 *   <Tooltip content="..." triggerRender={<span />}>…</Tooltip>
 */

/* ── 原语包装(供需要精细控制时直接用) ── */

function TooltipProvider({ delay = 500, closeDelay = 0, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} closeDelay={closeDelay} {...props} />
}

function TooltipRoot({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip-root" {...props} />
}

function TooltipTrigger({
  render,
  delay = 500,
  closeDelay = 0,
  ...props
}: TooltipPrimitive.Trigger.Props) {
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      render={render}
      delay={delay}
      closeDelay={closeDelay}
      {...props}
    />
  )
}

function TooltipContent({
  className,
  sideOffset = 6,
  side = "top",
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, "side" | "sideOffset">) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "max-w-[240px] rounded-lg px-3 py-2 text-[12.5px] leading-snug shadow-md outline-none",
            "bg-[var(--color-ink)] text-[var(--color-surface)]",
            "origin-(--transform-origin)",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
            "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            "data-[side=top]:slide-in-from-bottom-1",
            "data-[side=bottom]:slide-in-from-top-1",
            "data-[side=left]:slide-in-from-right-1",
            "data-[side=right]:slide-in-from-left-1",
            className
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow
            className="fill-[var(--color-ink)] [&>svg]:block"
          />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

/* ── 便捷组合包装 ── */

interface TooltipProps {
  /** 气泡里要显示的文字/节点 */
  content: React.ReactNode
  /** 触发器内容(鼠标悬停的元素) */
  children: React.ReactNode
  /** 悬停后等多久显示,ms,默认 500 */
  delay?: number
  /** 离开后等多久关闭,ms,默认 0 */
  closeDelay?: number
  /** Positioner 方向,默认 top */
  side?: TooltipPrimitive.Positioner.Props["side"]
  /** Positioner sideOffset,默认 6 */
  sideOffset?: number
  /** Popup className */
  popupClassName?: string
  /**
   * Trigger 的 render prop:当 children 本身是 <button>/<a> 等时传入,避免嵌套交互元素。
   * 例: triggerRender={<span tabIndex={0} />}
   */
  triggerRender?: React.ReactElement
  /** 是否禁用 tooltip */
  disabled?: boolean
}

function Tooltip({
  content,
  children,
  delay = 500,
  closeDelay = 0,
  side = "top",
  sideOffset = 6,
  popupClassName,
  triggerRender,
  disabled = false,
}: TooltipProps) {
  return (
    <TooltipRoot disabled={disabled}>
      <TooltipTrigger
        render={triggerRender ?? <span />}
        delay={delay}
        closeDelay={closeDelay}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} sideOffset={sideOffset} className={popupClassName}>
        {content}
      </TooltipContent>
    </TooltipRoot>
  )
}

export {
  Tooltip,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
}
export type { TooltipProps }
