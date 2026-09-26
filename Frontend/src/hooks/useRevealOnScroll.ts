import { useEffect } from "react";

/**
 * Bật hiệu ứng xuất hiện khi cuộn cho mọi phần tử có thuộc tính `data-reveal`.
 * Dùng một IntersectionObserver chung; MutationObserver bắt các phần tử được
 * render sau (lazy route, dữ liệu API). Có thể đặt `style={{ "--reveal-index": i }}`
 * để tạo hiệu ứng lần lượt.
 */
export function useRevealOnScroll() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const reveal = (element: Element) => element.setAttribute("data-revealed", "true");
    const intersection = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        intersection.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    const observe = (root: ParentNode) => {
      root.querySelectorAll("[data-reveal]:not([data-revealed])").forEach((element) => {
        if (reduceMotion) reveal(element);
        else intersection.observe(element);
      });
    };

    observe(document);
    const mutation = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.hasAttribute("data-reveal") && !node.hasAttribute("data-revealed")) {
          if (reduceMotion) reveal(node);
          else intersection.observe(node);
        }
        observe(node);
      }));
    });
    mutation.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutation.disconnect();
      intersection.disconnect();
    };
  }, []);
}
