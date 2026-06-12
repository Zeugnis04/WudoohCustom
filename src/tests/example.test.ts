import {arabicRegex, CustomFont, CustomSetting, hasArabicScript} from "../common"
import {extensions} from "../extensions"

extensions()

describe("arabicRegex and hasArabicScript", () => {
    test("matches Arabic text", () => {
        expect("السلام عليكم".match(arabicRegex)).not.toBeNull()
        expect("hello مرحبا world".match(arabicRegex)).not.toBeNull()
    })

    test("does not match non-Arabic text", () => {
        expect("hello world".match(arabicRegex)).toBeNull()
        expect("こんにちは".match(arabicRegex)).toBeNull()
        expect("".match(arabicRegex)).toBeNull()
    })

    test("hasArabicScript checks a node's text content", () => {
        expect(hasArabicScript(document.createTextNode("نص عربي"))).toBe(true)
        expect(hasArabicScript(document.createTextNode("plain text"))).toBe(false)
    })
})

describe("CustomSetting validation", () => {
    test("accepts a valid custom setting", () => {
        const setting = new CustomSetting("example.com", 125, 145, "Sahl Naskh")
        expect(CustomSetting.isCustomSetting(setting)).toBe(true)
        expect(CustomSetting.isCustomSettingsArray([setting])).toBe(true)
    })

    test("rejects out of range or missing values", () => {
        expect(CustomSetting.isCustomSetting(new CustomSetting("example.com", 99, 145, "Amiri"))).toBe(false)
        expect(CustomSetting.isCustomSetting(new CustomSetting("example.com", 125, 301, "Amiri"))).toBe(false)
        expect(CustomSetting.isCustomSetting(new CustomSetting("", 125, 145, "Amiri"))).toBe(false)
        expect(CustomSetting.isCustomSetting({})).toBe(false)
        expect(CustomSetting.isCustomSetting(null)).toBe(false)
    })

    test("empty array is a valid custom settings array", () => {
        expect(CustomSetting.isCustomSettingsArray([])).toBe(true)
    })
})

describe("CustomFont validation", () => {
    test("accepts a valid custom font", () => {
        const font = new CustomFont("My Font", "MyFont-Regular", "https://example.com/font.woff2")
        expect(CustomFont.isCustomFont(font)).toBe(true)
        expect(CustomFont.isCustomFontsArray([font])).toBe(true)
    })

    test("rejects missing fields", () => {
        expect(CustomFont.isCustomFont(new CustomFont("", "local", "url"))).toBe(false)
        expect(CustomFont.isCustomFont({})).toBe(false)
        expect(CustomFont.isCustomFont(null)).toBe(false)
    })

    test("injectCSS produces a valid @font-face rule", () => {
        const font = new CustomFont("My Font", "MyFont-Regular", "https://example.com/font.woff2")
        const css: string = CustomFont.injectCSS(font)
        expect(css).toContain("@font-face")
        expect(css).toContain("font-family: 'My Font'")
        expect(css).toContain("local('MyFont-Regular')")
        expect(css).toContain("url('https://example.com/font.woff2')")
    })
})

describe("extensions", () => {
    test("Array.contains and Array.clear", () => {
        const array: Array<number> = [1, 2, 3]
        expect(array.contains(2)).toBe(true)
        expect(array.contains(4)).toBe(false)
        array.clear()
        expect(array.length).toBe(0)
    })

    test("String.contains", () => {
        expect("hello world".contains("world")).toBe(true)
        expect("hello world".contains("mars")).toBe(false)
    })

    test("Array.filterAsync", async () => {
        const result: Array<number> = await [1, 2, 3, 4].filterAsync(async (it: number) => it % 2 === 0)
        expect(result).toEqual([2, 4])
    })
})
