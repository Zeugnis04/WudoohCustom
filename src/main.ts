import {
    arabicRegex,
    CustomFont,
    CustomSetting,
    hasArabicScript,
    injectCustomFonts,
    isNodeEditable,
    Message,
    MessageReasons,
    onDOMContentLoaded,
    runtime,
    sync,
    wait,
    WudoohKeys,
    WudoohStorage
} from "./common"
import {extensions} from "./extensions"

extensions()

/** The observer used in {@linkcode startObserver} to dynamically update any newly added Nodes */
let observer: MutationObserver | null = null

/**
 * Returns true if the passed in Node has been updated by Wudooh and false otherwise
 */
function hasNodeBeenUpdated(node: Node): boolean {
    return !!node && !!node.parentElement && node.parentElement.getAttribute("wudooh") === "true"
}

/**
 * Returns true if this document has already been updated by Wudooh before,
 * this is done in {@link notifyDocumentHasUpdated}
 */
function hasDocumentBeenUpdated(): boolean {
    return document.getElementById("wudoohMetaElement") !== null
}

/**
 * Gets all nodes within the passed in node that have any Arabic text
 * @param rootNode the node to use as the root of the traversal
 * @return an array of nodes that contain all the nodes with Arabic text that are children of the passed in
 * root node
 */
function getArabicTextNodesIn(rootNode: Node): Array<Node> {
    let treeWalker: TreeWalker = document.createTreeWalker(
        rootNode,
        NodeFilter.SHOW_TEXT
    )
    let arabicTextNodes: Array<Node> = []

    let node: Node | null = treeWalker.nextNode()
    while (!!node) {
        if (hasArabicScript(node)) arabicTextNodes.push(node)
        node = treeWalker.nextNode()
    }
    return arabicTextNodes
}

/**
 * Updates the passed in node's html to have the properties of a modified Arabic text node, this will
 * replace any text that matches arabicRegEx to be a span with the font size and line height specified by
 * the user's options, the span will have the attribute wudooh='true', this can be used to check if the
 * text has been updated by this function or not
 * @param node the node to update
 * @param textSize the size to update the text to
 * @param lineHeight the height to update the line to
 * @param font the name of the font to update the text to
 */
async function updateNode(node: Node, textSize: number, lineHeight: number, font: string): Promise<void> {
    const newSize: number = textSize / 100
    const newHeight: number = lineHeight / 100

    if (!!node.nodeValue) {
        if (hasNodeBeenUpdated(node)) updateByChanging(node, newSize, newHeight, font)
        else updateByAdding(node, newSize, newHeight, font)
    }
}

async function updateByAdding(node: Node, textSize: number, lineHeight: number, font: string): Promise<void> {
    const parent: Node | null = !!node ? node.parentNode : null
    // return if parent or node are null
    if (!parent) return
    // don't do anything if this node or its parent are editable
    if (isNodeEditable(parent) || isNodeEditable(node)) return

    let newHTML: string
    if (font === "Original") {
        newHTML = "<span wudooh='true' style='" +
            "font-size:" + textSize + "em;" +
            "line-height:" + lineHeight + "em;" +
            "'>$&</span>"
    } else {
        newHTML = "<span wudooh='true' style='" +
            "font-size:" + textSize + "em;" +
            "line-height:" + lineHeight + "em;" +
            "font-family:" + "\"" + font + "\";" +
            "'>$&</span>"
    }

    if (!node.nodeValue) return
    const text: string = node.nodeValue.replace(arabicRegex, newHTML)

    const nextSibling: ChildNode | null = node.nextSibling

    // the div is temporary and doesn't show up in the html
    let newElement: HTMLDivElement = document.createElement("div")
    newElement.innerHTML = text

    while (newElement.firstChild) {
        // we only insert the passed in html, the div is not inserted
        parent.insertBefore(newElement.firstChild, nextSibling)
    }
    parent.removeChild(node)
}

async function updateByChanging(node: Node, textSize: number, lineHeight: number, font: string): Promise<void> {
    if (!node || !node.parentElement) return
    node.parentElement.style.fontSize = textSize + "em"
    node.parentElement.style.lineHeight = lineHeight + "em"
    if (font === "Original") node.parentElement.style.fontFamily = ""
    else node.parentElement.style.fontFamily = font
}

/**
 * Updates all Arabic script nodes in this document's body by calling updateNode() on each node in this
 * document with Arabic script
 * @param textSize the size to update the text to
 * @param lineHeight the height to update the line to
 * @param font the name of the font to update the text to
 */
async function updateAll(textSize: number, lineHeight: number, font: string): Promise<void> {
    getArabicTextNodesIn(document.body).forEach((it: Node) => updateNode(it, textSize, lineHeight, font))
}

/**
 * Starts the observer that will observe for any additions to the document and update them if they have any
 * Arabic text and they have not been updated yet
 * @param textSize the size to update the text to
 * @param lineHeight the height to update the line to
 * @param font the name of the font to update the text to
 */
async function startObserver(textSize: number, lineHeight: number, font: string): Promise<void> {
    // If observer was existing then disconnect it and delete it
    if (!!observer) {
        observer.disconnect()
        observer = null
    }
    if (!observer) {
        const config: MutationObserverInit = {
            attributes: false, // we don't care about attribute changes
            attributeOldValue: false, // we don't care about attribute changes
            characterData: true, // we get notified of any changes to character data
            characterDataOldValue: true, // we keep the old value
            childList: true, // we get notified about changes to a node's children
            subtree: true // we get notified about any changes to any of a node's descendants
        }

        const callback: MutationCallback = (mutationsList: Array<MutationRecord>) => {
            mutationsList.forEach((record: MutationRecord) => {
                // If something has been added
                if (record.addedNodes.length > 0) {
                    //  For each added node
                    record.addedNodes.forEach((addedNode: Node) => {
                        // For each node with Arabic script in addedNode
                        getArabicTextNodesIn(addedNode).forEach((arabicNode: Node) => {
                            updateNode(arabicNode, textSize, lineHeight, font)
                        })
                    })
                }

                // If the value has changed
                if (record.target.nodeValue !== record.oldValue && record.target.parentNode instanceof Node) {
                    // If the node now has Arabic text when it didn't, this is rare and only occurs on YouTube
                    getArabicTextNodesIn(record.target.parentNode).forEach((arabicNode: Node) => {
                        updateNode(arabicNode, textSize, lineHeight, font)
                    })
                }
            })
        }

        observer = new MutationObserver(callback)
        observer.observe(document.body, config)
    }
}

/**
 * Adds an element to this document to notify that Wudooh (this ts file) has been run on it,
 * if this has been called then {@link hasDocumentBeenUpdated} will return `true`
 * Multiple calls to this do nothing after the first
 */
async function notifyDocumentHasUpdated(): Promise<void> {
    if (!hasDocumentBeenUpdated()) {
        let meta: HTMLMetaElement = document.createElement("meta")
        meta.id = "wudoohMetaElement"
        meta.setAttribute("wudooh", "true")
        document.head.appendChild(meta)
    }
}

async function toggleOff(): Promise<void> {
    if (!!observer) {
        observer.disconnect()
        observer = null
    }
    getArabicTextNodesIn(document.body).forEach((node: Node) => {
        if (!!node && !!node.parentElement && !!node.parentElement.style) {
            node.parentElement.style.fontSize = ""
            node.parentElement.style.lineHeight = ""
            node.parentElement.style.fontFamily = ""
        }
    })
}

async function addMessageListener(): Promise<void> {
    runtime.onMessage.addListener((message: Message) => {
        switch (message.reason) {
            case MessageReasons.updateAllText:
                main()
                break
            case MessageReasons.injectCustomFonts:
                injectCustomFonts(message.data)
                break
            case MessageReasons.toggleOff:
                toggleOff()
                break
        }
    })
}

async function main(): Promise<void> {
    const storage: WudoohStorage = await sync.get(WudoohKeys.all())
    let textSize: number = storage.textSize ?? 125
    let lineHeight: number = storage.lineHeight ?? 145
    let font: string = storage.font ?? "Sahl Naskh"
    const isOn: boolean = storage.onOff ?? false
    const whitelisted: Array<string> = storage.whitelisted ?? []
    const customSettings: Array<CustomSetting> = storage.customSettings ?? []
    const customFonts: Array<CustomFont> = storage.customFonts ?? []

    const thisURL: string = new URL(document.URL).hostname
    const isWhitelisted: boolean = !!whitelisted.find((it: string) => it === thisURL)

    const customSite: CustomSetting | undefined =
        customSettings.find((custom: CustomSetting) => custom.url === thisURL)

    // Only do anything if the switch is on and this site is not whitelisted
    if (isOn && !isWhitelisted) {
        injectCustomFonts(customFonts)
        // If it's a custom site then change the textSize, lineHeight and font
        if (!!customSite) {
            textSize = customSite.textSize
            lineHeight = customSite.lineHeight
            font = customSite.font
        }
        updateAll(textSize, lineHeight, font)
        // Force a second attempt for pesky websites
        onDOMContentLoaded(() => wait(1000, () =>
            updateAll(textSize, lineHeight, font))
        )
        wait(1000, () => updateAll(textSize, lineHeight, font))
        startObserver(textSize, lineHeight, font)
        notifyDocumentHasUpdated()
    }
    // We've been updated and now we've become whitelisted
    if (hasDocumentBeenUpdated() && isWhitelisted) {
        toggleOff()
    }
}

main()
addMessageListener()
