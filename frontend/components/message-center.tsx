"use client";

import { Fragment, useMemo, useState, type FormEvent, type ReactNode } from "react";
import styles from "./message-center.module.css";

export interface MessageCenterThread {
  id: number;
  title: string;
  subtitle: string;
  meta?: string;
  category?: string;
  avatarLabel?: string;
  unreadCount?: number;
  lastActivity?: string;
  status?: "open" | "closed";
}

export interface MessageCenterMessage {
  id: number;
  sender_type: string;
  body: string;
  created_at: string;
  read_at?: string | null;
}

export interface MessageCenterFilter {
  id: string;
  label: string;
}

interface MessageCenterProps {
  title: string;
  description: string;
  eyebrow: string;
  threads: MessageCenterThread[];
  messages: MessageCenterMessage[];
  selectedThreadId: number | null;
  currentUserType: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSelectThread: (id: number) => void;
  loadingThreads?: boolean;
  loadingMessages?: boolean;
  sending?: boolean;
  live?: boolean;
  isConversationOpen?: boolean;
  error?: string;
  notice?: string;
  filters?: MessageCenterFilter[];
  senderLabels?: Record<string, string>;
  pageActions?: ReactNode;
  chatActions?: ReactNode;
  sidebarFooter?: ReactNode;
  emptyThreadsTitle?: string;
  emptyThreadsDescription?: string;
  emptyMessagesTitle?: string;
  emptyMessagesDescription?: string;
  composerPlaceholder?: string;
  closedMessage?: string;
}

function safeDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTime(value: string) {
  const date = safeDate(value);
  return date ? new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(date) : "—";
}

function dateKey(value: string) {
  const date = safeDate(value);
  return date ? [date.getFullYear(), date.getMonth(), date.getDate()].join("-") : "unknown";
}

function formatDay(value: string) {
  const date = safeDate(value);
  if (!date) return "بدون تاریخ";
  const today = new Date();
  if (dateKey(value) === dateKey(today.toISOString())) return "امروز";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey(value) === dateKey(yesterday.toISOString())) return "دیروز";
  return new Intl.DateTimeFormat("fa-IR", { weekday: "long", month: "long", day: "numeric" }).format(date);
}

function formatActivity(value?: string) {
  const date = value ? safeDate(value) : null;
  if (!date) return "هنوز پیامی ثبت نشده";
  const today = new Date();
  if (dateKey(value || "") === dateKey(today.toISOString())) return formatTime(value || "");
  return new Intl.DateTimeFormat("fa-IR", { month: "short", day: "numeric" }).format(date);
}

function Icon({ name }: { name: "search" | "message" | "send" | "check" | "clock" | "empty" }) {
  const paths = {
    search: "M20.5 20.5 16 16M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z",
    message: "M20 11.5a8.3 8.3 0 0 1-8.5 8.2 9 9 0 0 1-4-.9L3 20l1.5-4A8 8 0 0 1 3 11.5 8.3 8.3 0 0 1 11.5 3 8.3 8.3 0 0 1 20 11.5Z",
    send: "m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13",
    check: "m5 12 4 4L19 6",
    clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    empty: "M4 5h16v12H8l-4 3V5Z",
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}

export function MessageCenter({
  title,
  description,
  eyebrow,
  threads,
  messages,
  selectedThreadId,
  currentUserType,
  draft,
  onDraftChange,
  onSubmit,
  onSelectThread,
  loadingThreads = false,
  loadingMessages = false,
  sending = false,
  live = false,
  isConversationOpen = true,
  error,
  notice,
  filters = [{ id: "all", label: "همه" }, { id: "unread", label: "خوانده‌نشده" }],
  senderLabels = {},
  pageActions,
  chatActions,
  sidebarFooter,
  emptyThreadsTitle = "هنوز گفت‌وگویی وجود ندارد",
  emptyThreadsDescription = "به‌محض شروع یک گفتگو، اینجا نمایش داده می‌شود.",
  emptyMessagesTitle = "گفتگو را شروع کن",
  emptyMessagesDescription = "اولین پیام این گفتگو را ارسال کن.",
  composerPlaceholder = "پیام خود را بنویس...",
  closedMessage = "این گفتگو در حال حاضر بسته است.",
}: MessageCenterProps) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const selected = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [threads, selectedThreadId],
  );
  const filteredThreads = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fa-IR");
    return threads.filter((thread) => {
      const matchesFilter = activeFilter === "all"
        || (activeFilter === "unread" && (thread.unreadCount || 0) > 0)
        || thread.category === activeFilter;
      const searchable = [thread.title, thread.subtitle, thread.meta, thread.category]
        .filter(Boolean).join(" ").toLocaleLowerCase("fa-IR");
      return matchesFilter && (!normalized || searchable.includes(normalized));
    });
  }, [threads, query, activeFilter]);

  const unreadTotal = threads.reduce((sum, thread) => sum + (thread.unreadCount || 0), 0);

  return (
    <div className={styles.page} dir="rtl">
      <header className={styles.pageHeading}>
        <div className={styles.headingCopy}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <p className={styles.description}>{description}</p>
        </div>
        {pageActions && <div className={styles.pageActions}>{pageActions}</div>}
      </header>

      {error && <div className={styles.alertError} role="alert">{error}</div>}
      {notice && <div className={styles.alertSuccess} role="status">{notice}</div>}

      <section className={styles.workspace} aria-label="مرکز پیام‌رسان چکاد">
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTop}>
            <div className={styles.sidebarTitleRow}>
              <div>
                <span className={styles.sidebarKicker}>INBOX</span>
                <h2>گفت‌وگوها</h2>
              </div>
              <span className={styles.threadCount}>{threads.length.toLocaleString("fa-IR")}</span>
            </div>

            <label className={styles.searchBox}>
              <Icon name="search" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="جست‌وجوی گفتگو..."
                aria-label="جست‌وجوی گفتگوها"
              />
              <kbd>/</kbd>
            </label>

            <div className={styles.filters} role="group" aria-label="فیلتر گفتگوها">
              {filters.map((filter) => {
                const count = filter.id === "unread"
                  ? unreadTotal
                  : filter.id === "all"
                    ? threads.length
                    : threads.filter((thread) => thread.category === filter.id).length;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    className={activeFilter === filter.id ? styles.filterActive : styles.filter}
                    onClick={() => setActiveFilter(filter.id)}
                    aria-pressed={activeFilter === filter.id}
                  >
                    {filter.label}
                    {filter.id === "unread" && count > 0 && <span>{count.toLocaleString("fa-IR")}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.threadList}>
            {filteredThreads.map((thread) => {
              const active = selectedThreadId === thread.id;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => onSelectThread(thread.id)}
                  className={active ? styles.threadActive : styles.thread}
                  aria-pressed={active}
                >
                  <span className={styles.avatar}>{thread.avatarLabel || thread.title.slice(0, 1) || "چ"}</span>
                  <span className={styles.threadCopy}>
                    <span className={styles.threadTitleRow}>
                      <strong>{thread.title}</strong>
                      <time>{formatActivity(thread.lastActivity)}</time>
                    </span>
                    <span className={styles.threadSubtitle}>{thread.subtitle}</span>
                    {thread.meta && <span className={styles.threadMeta}>{thread.meta}</span>}
                  </span>
                  {(thread.unreadCount || 0) > 0 && <span className={styles.unreadBadge}>{(thread.unreadCount || 0).toLocaleString("fa-IR")}</span>}
                  {thread.status === "closed" && <span className={styles.closedDot} title="گفتگو بسته است" />}
                </button>
              );
            })}

            {loadingThreads && (
              <div className={styles.listState}>
                <span className={styles.spinner} />
                <span>در حال دریافت گفتگوها...</span>
              </div>
            )}
            {!loadingThreads && !filteredThreads.length && (
              <div className={styles.listState}>
                <span className={styles.stateIcon}><Icon name="message" /></span>
                <strong>{query || activeFilter !== "all" ? "گفتگویی پیدا نشد" : emptyThreadsTitle}</strong>
                <span>{query || activeFilter !== "all" ? "عبارت جست‌وجو یا فیلتر را تغییر بده." : emptyThreadsDescription}</span>
              </div>
            )}
          </div>
          {sidebarFooter && <div className={styles.sidebarFooter}>{sidebarFooter}</div>}
          <div className={styles.sidebarFootnote}>
            <span className={styles.secureMark}>✓</span>
            ارتباطات این فضا مخصوص کاربران چکاد است.
          </div>
        </aside>

        <section className={styles.chatPanel} aria-label="پنجره گفتگو">
          {selected ? (
            <>
              <header className={styles.chatHeader}>
                <div className={styles.contactIdentity}>
                  <span className={styles.avatarLarge}>{selected.avatarLabel || selected.title.slice(0, 1) || "چ"}</span>
                  <div>
                    <h2>{selected.title}</h2>
                    <p>{selected.subtitle}{selected.meta ? " · " + selected.meta : ""}</p>
                  </div>
                </div>
                <div className={styles.chatHeaderActions}>
                  <span className={live ? styles.connectionLive : styles.connectionFallback}>
                    <i />
                    {live ? "اتصال زنده" : "همگام‌سازی"}
                  </span>
                  {selected.status && (
                    <span className={selected.status === "open" ? styles.statusOpen : styles.statusClosed}>
                      {selected.status === "open" ? "فعال" : "بسته"}
                    </span>
                  )}
                  {chatActions}
                </div>
              </header>

              <div className={styles.conversation} aria-live="polite">
                {loadingMessages && (
                  <div className={styles.loadingMessages}>
                    <span className={styles.spinner} />
                    <span>در حال بارگذاری پیام‌ها...</span>
                  </div>
                )}
                {!loadingMessages && messages.length === 0 && (
                  <div className={styles.emptyConversation}>
                    <span className={styles.emptyIcon}><Icon name="empty" /></span>
                    <strong>{emptyMessagesTitle}</strong>
                    <p>{emptyMessagesDescription}</p>
                  </div>
                )}
                {messages.map((message, index) => {
                  const mine = message.sender_type === currentUserType;
                  const previous = index > 0 ? messages[index - 1] : null;
                  const showDay = !previous || dateKey(previous.created_at) !== dateKey(message.created_at);
                  const senderLabel = senderLabels[message.sender_type] || message.sender_type;
                  return (
                    <Fragment key={message.id}>
                      {showDay && <div className={styles.dayDivider}><span>{formatDay(message.created_at)}</span></div>}
                      <div className={mine ? styles.messageRowMine : styles.messageRowOther}>
                        <article className={mine ? styles.bubbleMine : styles.bubbleOther}>
                          {!mine && <span className={styles.senderLabel}>{senderLabel}</span>}
                          <p>{message.body}</p>
                          <footer>
                            <time>{formatTime(message.created_at)}</time>
                            {mine && (
                              <span className={message.read_at ? styles.readStatus : styles.sentStatus}>
                                {message.read_at ? "خوانده‌شده" : "ارسال‌شده"}
                                {message.read_at ? <Icon name="check" /> : <Icon name="clock" />}
                              </span>
                            )}
                          </footer>
                        </article>
                      </div>
                    </Fragment>
                  );
                })}
              </div>

              {isConversationOpen ? (
                <form className={styles.composer} onSubmit={onSubmit}>
                  <div className={styles.composerInputWrap}>
                    <textarea
                      value={draft}
                      onChange={(event) => onDraftChange(event.target.value)}
                      rows={1}
                      maxLength={4000}
                      placeholder={composerPlaceholder}
                      aria-label={composerPlaceholder}
                    />
                    <span>{draft.length.toLocaleString("fa-IR")} / ۴۰۰۰</span>
                  </div>
                  <button type="submit" className={styles.sendButton} disabled={sending || !draft.trim()}>
                    <Icon name="send" />
                    <span>{sending ? "در حال ارسال" : "ارسال پیام"}</span>
                  </button>
                </form>
              ) : (
                <div className={styles.closedNotice}>{closedMessage}</div>
              )}
            </>
          ) : (
            <div className={styles.welcomeState}>
              <div className={styles.welcomeOrb}><Icon name="message" /></div>
              <p className={styles.welcomeEyebrow}>CHEKAD MESSENGER</p>
              <h2>گفت‌وگو، بخشی از مسیر پیشرفت</h2>
              <p>از فهرست سمت راست یک گفتگو را انتخاب کن تا پیام‌ها و جزئیات آن را ببینی.</p>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
