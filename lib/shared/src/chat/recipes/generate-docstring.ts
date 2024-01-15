import {
    languageFromFilename,
    markdownCodeBlockLanguageIDForFilename,
    ProgrammingLanguage,
} from '../../common/languages'
import { MAX_RECIPE_INPUT_TOKENS, MAX_RECIPE_SURROUNDING_TOKENS } from '../../prompt/constants'
import { truncateText, truncateTextStart } from '../../prompt/truncation'
import { type Interaction } from '../transcript/interaction'

import { getContextMessagesFromSelection, MARKDOWN_FORMAT_PROMPT, newInteraction } from './helpers'
import { type Recipe, type RecipeContext, type RecipeID } from './recipe'

export class GenerateDocstring implements Recipe {
    public id: RecipeID = 'generate-docstring'
    public title = 'Generate Docstring'

    public async getInteraction(_humanChatInput: string, context: RecipeContext): Promise<Interaction | null> {
        const source = this.id
        const selection = context.editor.getActiveTextEditorSelectionOrEntireFile()
        if (!selection) {
            await context.editor.showWarningMessage('No code selected. Please select some code and try again.')
            return Promise.resolve(null)
        }

        const truncatedSelectedText = truncateText(selection.selectedText, MAX_RECIPE_INPUT_TOKENS)
        const truncatedPrecedingText = truncateTextStart(selection.precedingText, MAX_RECIPE_SURROUNDING_TOKENS)
        const truncatedFollowingText = truncateText(selection.followingText, MAX_RECIPE_SURROUNDING_TOKENS)

        const language = languageFromFilename(selection.fileUri)
        const promptPrefix = `Generate a comment documenting the parameters and functionality of the following ${language} code:`
        let additionalInstructions = `Use the ${language} documentation style to generate a ${language} comment.`
        if (language === ProgrammingLanguage.Java) {
            additionalInstructions = 'Use the JavaDoc documentation style to generate a Java comment.'
        } else if (language === ProgrammingLanguage.Python) {
            additionalInstructions = 'Use a Python docstring to generate a Python multi-line string.'
        }
        const promptMessage = `${promptPrefix}\n\`\`\`\n${truncatedSelectedText}\n\`\`\`\nOnly generate the documentation, do not generate the code. ${additionalInstructions} ${MARKDOWN_FORMAT_PROMPT}`

        let docStart = ''
        if (
            language === ProgrammingLanguage.Java ||
            language === ProgrammingLanguage.JavaScript ||
            language === ProgrammingLanguage.TypeScript
        ) {
            docStart = '/*'
        } else if (language === ProgrammingLanguage.Python) {
            docStart = '"""\n'
        } else if (language === ProgrammingLanguage.Go) {
            docStart = '// '
        }

        const displayText = `Generate documentation for the following code:\n\`\`\`\n${selection.selectedText}\n\`\`\``

        const assistantResponsePrefix = `Here is the generated documentation:\n\`\`\`${markdownCodeBlockLanguageIDForFilename(
            selection.fileUri
        )}\n${docStart}`
        return newInteraction({
            text: promptMessage,
            displayText,
            source,
            assistantPrefix: assistantResponsePrefix,
            assistantText: assistantResponsePrefix,
            contextMessages: getContextMessagesFromSelection(
                truncatedSelectedText,
                truncatedPrecedingText,
                truncatedFollowingText,
                selection,
                context.codebaseContext
            ),
        })
    }
}
