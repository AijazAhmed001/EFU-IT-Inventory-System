export const INPUT_LIMITS = {
  shortText: 100,
  standardText: 200,
  search: 200,
  email: 254,
  password: 128,
  phone: 30,
  longText: 2000,
  money: 999_999_999_999.99,
  wholeNumber: 999_999_999,
} as const

const longTextTerms = [
  "address",
  "description",
  "note",
  "remark",
  "reason",
  "message",
  "accessories",
]

const shortTextTerms = [
  "code",
  "serial",
  "tag",
  "invoice",
  "phone",
  "contact",
  "hostname",
  "domain",
  "bios",
  "mac",
  "ip address",
  "version",
  "prefix",
]

function inputIdentity(input: HTMLInputElement | HTMLTextAreaElement) {
  return [
    input.id,
    input.getAttribute("name"),
    input.getAttribute("placeholder"),
    input.getAttribute("aria-label"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function textLimit(input: HTMLInputElement | HTMLTextAreaElement) {
  const identity = inputIdentity(input)
  if (input instanceof HTMLTextAreaElement || longTextTerms.some((term) => identity.includes(term))) {
    return INPUT_LIMITS.longText
  }
  if (input instanceof HTMLInputElement) {
    if (input.type === "email") return INPUT_LIMITS.email
    if (input.type === "password") return INPUT_LIMITS.password
    if (input.type === "search" || identity.includes("search")) return INPUT_LIMITS.search
    if (input.type === "tel" || identity.includes("phone")) return INPUT_LIMITS.phone
  }
  if (shortTextTerms.some((term) => identity.includes(term))) return INPUT_LIMITS.shortText
  return INPUT_LIMITS.standardText
}

function constrainInput(input: HTMLInputElement | HTMLTextAreaElement) {
  if (!input.placeholder && !(input instanceof HTMLInputElement && ["date", "number", "file"].includes(input.type))) {
    const label = input.id ? document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(input.id)}"]`) : null
    const fieldName = label?.textContent?.replace("*", "").trim() || input.getAttribute("aria-label") || input.getAttribute("name")?.replace(/[-_]/g, " ")
    if (fieldName) input.placeholder = `${input instanceof HTMLTextAreaElement ? "Enter" : "Enter"} ${fieldName.toLowerCase()}`
  }
  if (input instanceof HTMLTextAreaElement) {
    input.maxLength = textLimit(input)
    return
  }

  if (input.type === "number") {
    const identity = inputIdentity(input)
    if (!input.min) input.min = "0"
    if (!input.max) {
      input.max = identity.includes("percent")
        ? "100"
        : identity.includes("year")
          ? "100"
          : identity.includes("cost") || identity.includes("value") || identity.includes("amount")
            ? String(INPUT_LIMITS.money)
            : String(INPUT_LIMITS.wholeNumber)
    }
    return
  }

  if (["text", "email", "password", "search", "tel", "url", ""].includes(input.type)) {
    input.maxLength = textLimit(input)
  }
}

function showValidationMessage(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  const existing = input.parentElement?.querySelector(":scope > .input-validation-message")
  const message = existing instanceof HTMLElement ? existing : document.createElement("small")
  message.className = "input-validation-message"
  message.textContent = input.validity.valueMissing
    ? "This field is required."
    : input.validity.typeMismatch
      ? "Enter a valid value."
      : input.validity.rangeOverflow
        ? `Value cannot exceed ${input.getAttribute("max")}.`
        : input.validationMessage
  if (!existing) input.insertAdjacentElement("afterend", message)
}

function constrainTree(root: ParentNode) {
  root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea").forEach(constrainInput)
}

export function installInputLimits() {
  constrainTree(document)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return
        if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) constrainInput(node)
        constrainTree(node)
      })
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
  const invalid = (event: Event) => {
    const input = event.target
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) {
      showValidationMessage(input)
    }
  }
  const clear = (event: Event) => {
    const input = event.target
    if (!(input instanceof HTMLElement)) return
    input.parentElement?.querySelector(":scope > .input-validation-message")?.remove()
  }
  document.addEventListener("invalid", invalid, true)
  document.addEventListener("input", clear, true)
  return () => {
    observer.disconnect()
    document.removeEventListener("invalid", invalid, true)
    document.removeEventListener("input", clear, true)
  }
}
