import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData, resolvePostProps } from '@/lib/db/SiteDataApi'
import { checkSlugHasMorThanTwoSlash, processPostData } from '@/lib/utils/post'
import { idToUuid } from 'notion-utils'
import Slug from '..'

/**
 * 根据notion的slug访问页面
 * 解析三级以上目录 /article/2023/10/29/test
 * @param {*} props
 * @returns
 */
const PrefixSlug = props => {
  return <Slug {...props} />
}

/**
 * 编译渲染页面路径
 * @returns
 */
export async function getStaticPaths() {
  if (!BLOG.isProd) {
    return {
      paths: [],
      fallback: true
    }
  }

  const from = 'slug-paths'
  const { allPages } = await fetchGlobalAllData({ from })
  const paths = allPages
    ?.filter(row => checkSlugHasMorThanTwoSlash(row))
    .map(row => ({
      params: {
        prefix: row.slug.split('/')[0],
        slug: row.slug.split('/')[1],
        suffix: row.slug.split('/').slice(2)
      }
    }))
  return {
    paths: paths,
    fallback: true
  }
}

/**
 * 抓取页面数据
 * @param {*} param0
 * @returns
 */
export async function getStaticProps({
  params: { prefix, slug, suffix },
  locale
}) {
  try {
    const props = await resolvePostProps({
      prefix,
      slug,
      suffix,
      locale,
    })

    if (!props?.post) {
      console.warn(`[getStaticProps] 无法找到文章，返回降级页面: /${prefix}/${slug}/${suffix?.join('/')}`)
      return {
        props: {
          post: {
            id: `error-${prefix}-${slug}-${suffix?.join('-')}`,
            title: '文章暂时无法访问',
            summary: '该文章可能已被隐藏、删除或正在生成中。',
            status: 'Published',
            type: 'Post',
            slug: `${prefix}/${slug}/${suffix?.join('/')}`,
            date: { start_date: new Date().toISOString().slice(0, 10) },
            tags: [],
            tagItems: []
          },
          NOTION_CONFIG: props?.NOTION_CONFIG || {},
          siteInfo: props?.siteInfo || {},
        },
        revalidate: 10
      }
    }

    return {
      props,
      revalidate: process.env.EXPORT
        ? undefined
        : siteConfig(
          'NEXT_REVALIDATE_SECOND',
          BLOG.NEXT_REVALIDATE_SECOND,
          props.NOTION_CONFIG
        )
    }
  } catch (error) {
    console.error(`[getStaticProps] 构建页面失败: /${prefix}/${slug}/${suffix?.join('/')}`, error)
    return {
      props: {
        post: {
          id: `error-${prefix}-${slug}-${suffix?.join('-')}`,
          title: '构建失败',
          summary: '生成此页面时发生错误，请查看后台日志。',
          status: 'Published',
          type: 'Post',
          slug: `${prefix}/${slug}/${suffix?.join('/')}`,
          date: { start_date: new Date().toISOString().slice(0, 10) },
          tags: [],
          tagItems: []
        },
        NOTION_CONFIG: {},
        siteInfo: {},
      },
      revalidate: 10
    }
  }
}

export default PrefixSlug
