/* Shared SBI-style News Updates controls for project-page review and WordPress. */
(() => {
  const style = document.createElement('style');
  style.textContent = `
    #espl-project-page .project-news-controls{position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;width:max-content!important;min-height:34px!important;padding:0 29px!important;margin:4px auto 0!important}
    #espl-project-page .project-news-controls[hidden]{display:none!important}
    #espl-project-page .project-news-controls .project-news-arrow{appearance:none!important;position:absolute!important;top:50%!important;bottom:auto!important;display:grid!important;place-items:center!important;flex:0 0 24px!important;width:24px!important;height:34px!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;color:rgba(55,65,81,.72)!important;cursor:pointer;opacity:.92;transform:translateY(-50%)!important;translate:none!important;rotate:none!important;scale:none!important}
    #espl-project-page .project-news-controls .project-news-arrow--previous{left:0!important;right:auto!important}
    #espl-project-page .project-news-controls .project-news-arrow--next{right:0!important;left:auto!important}
    #espl-project-page .project-news-controls .project-news-arrow svg{position:absolute!important;top:50%!important;left:50%!important;display:block!important;width:16px!important;height:16px!important;margin:0!important;fill:none!important;stroke:currentColor!important;stroke-width:1.5!important;stroke-linecap:butt!important;stroke-linejoin:miter!important;transform:translate(-50%,-50%)!important}
    #espl-project-page .project-news-controls .project-news-arrow:is(:hover,:focus-visible){color:rgba(31,41,55,.95)!important;opacity:1!important;background:transparent!important;box-shadow:none!important}
    #espl-project-page .project-news-controls .project-news-dots{display:flex!important;flex:0 0 auto!important;align-items:center!important;justify-content:center!important;gap:.5rem!important;min-height:17px!important;margin:0!important;padding:0!important}
    #espl-project-page .project-news-controls .knowledge-dot{appearance:none!important;flex:0 0 6px!important;width:6px!important;height:6px!important;margin:0!important;padding:0!important;border:0!important;border-radius:50%!important;background:rgba(55,65,81,.2)!important;box-shadow:none!important;cursor:pointer}
    #espl-project-page .project-news-controls .knowledge-dot.is-active{flex-basis:23px!important;width:23px!important;border-radius:999px!important;background:#f4ba20!important}
    @media(prefers-reduced-motion:reduce){#espl-project-page .project-news-controls .project-news-arrow{transition:none!important}}
  `;
  (document.getElementById('espl-project-page') || document.head).append(style);
})();
