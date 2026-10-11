/** Dispatched by the global header when the user asks to create a link. */
export const CREATE_LINK_EVENT = 'pathio:create-link'

/** Ask the currently-mounted shortener (if any) to focus its input. */
export function requestCreateLink(): void {
  window.dispatchEvent(new Event(CREATE_LINK_EVENT))
}
