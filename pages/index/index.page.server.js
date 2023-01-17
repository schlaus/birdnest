export function onBeforeRender(pageContext) {

  const pageProps = pageContext.initialData

  return {
    pageContext: { pageProps }
  }
}

export const passToClient = ['pageProps']
