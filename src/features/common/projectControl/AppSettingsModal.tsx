import {
  FormControl,
  FormLabel,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import {
  languageNames,
  supportedLanguages,
  type SupportedLanguage,
} from 'src/i18n'

interface AppSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AppSettingsModal({ isOpen, onClose }: AppSettingsModalProps) {
  const { i18n, t } = useTranslation()
  const activeLanguage = i18n.resolvedLanguage ?? i18n.language

  const changeLanguage = (language: SupportedLanguage) => {
    void i18n.changeLanguage(language)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalOverlay />
      <ModalContent borderRadius="sm">
        <ModalHeader>{t('settings.title')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <FormControl>
            <FormLabel fontSize="sm">{t('settings.language')}</FormLabel>
            <Select
              value={activeLanguage}
              onChange={(event) =>
                changeLanguage(event.target.value as SupportedLanguage)
              }
            >
              {supportedLanguages.map((language) => (
                <option key={language} value={language}>
                  {languageNames[language]}
                </option>
              ))}
            </Select>
          </FormControl>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
