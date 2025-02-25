<script setup lang=ts>
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '@/components/ui/avatar'

  import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
  } from '@/components/ui/breadcrumb'

  import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
  } from '@/components/ui/collapsible'
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu'
  import { Separator } from '@/components/ui/separator'
  import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
  } from '@/components/ui/sidebar'
  import {
    BadgeCheck,
    Bell,
    ChevronRight,
    ChevronsUpDown,
    Clock,
    CreditCard,
    DownloadIcon,
    Folder,
    Forward,
    HistoryIcon,
    HomeIcon,
    LogOut,
    MoreHorizontal,
    MusicIcon,
    Plus,
    Sparkles,
    Star,
    Telescope,
    Trash2,
    UserIcon,
    UserRound,
    Video,
    YoutubeIcon,
    Search
  } from 'lucide-vue-next'
  import { ref, onMounted, watch } from 'vue'
  import { useRouter } from 'vue-router'


interface NavItem {
  onClick(): unknown
  title: string;
  url: string;
  icon: any;
  isActive?: boolean;
  items?: NavItem[];
}

const data = {
  user: {
    name: 'Will',
    email: 'will@parsonlabs.com',
    avatar: '/avatars/shadcn.jpg',
  },
  navMain: [
    {
      title: 'Home',
      url: '#',
      icon: HomeIcon,
      isActive: true,
      items: [],
    },
    {
      title: 'Subscriptions',
      url: '#',
      icon: YoutubeIcon,
      items: [],
    },
    {
      title: 'Music',
      url: '#',
      icon: MusicIcon,
      items: [],
    },
    {
      title: 'You',
      url: '#',
      icon: UserIcon,
      items: [],
    },
    {
      title: 'Downloads',
      url: '#',
      icon: DownloadIcon,
      items: [],
    },
    {
      title: 'Explore',
      url: '#',
      icon: Telescope,
      items: [],
    },
    {
      title: 'Social',
      url: '#',
      icon: UserRound,
      items: [],
    },
  ] as unknown as NavItem[],
    projects: [
    {
      name: 'My Videos',
      url: '#',
      icon: Video,
    },
    {
      name: 'Favorites',
      url: '#',
      icon: Star,
    },
    {
      name: 'Watch Later',
      url: '#',
      icon: Clock,
    },
    {
      name: 'History',
      url: '#',
      icon: HistoryIcon,
    },
  ],
}

const activeTeam = ref({
  name: 'ParsonLabs Video',
  plan: '',
  logo: 'https://avatars.githubusercontent.com/u/138057124?s=200&v=4'
})

const router = useRouter()

const sidebarCollapsed = ref(true)

const goToHome = () => {
  router.push('/')
}

onMounted(() => {
  const savedState = localStorage.getItem('sidebarCollapsed')
  sidebarCollapsed.value = savedState !== null ? savedState === 'true' : false
})

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
  localStorage.setItem('sidebarCollapsed', sidebarCollapsed.value.toString())
}

data.navMain = data.navMain.map(item => {
  if (item.title === 'Home') {
    return {
      ...item,
      onClick: goToHome
    }
  }
  return item
})

</script>

<template>
  <SidebarProvider>
    <Sidebar collapsible="icon" :collapsed="sidebarCollapsed">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  @click="goToHome"
                >
                  <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <img :src="activeTeam.logo" class="size-8 rounded-sm cursor-pointer" @click.stop="goToHome" />
                  </div>
                  <div class="grid flex-1 text-left text-sm leading-tight cursor-pointer" @click.stop="goToHome">
                    <span class="truncate font-semibold">{{ activeTeam.name }}</span>
                    <span class="truncate text-xs">{{ activeTeam.plan }}</span>
                  </div>
                </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <Collapsible
              v-for="item in data.navMain"
              :key="item.title"
              as-child
              :default-open="item.isActive"
              class="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger as-child>
                  <SidebarMenuButton :tooltip="item.title" @click="item.onClick ? item.onClick() : null">
                    <component :is="item.icon" />
                    <span>{{ item.title }}</span>
                    <ChevronRight class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem
                      v-for="subItem in item.items"
                      :key="subItem.title"
                    >
                      <SidebarMenuSubButton as-child>
                        <a :href="subItem.url">
                          <span>{{ subItem.title }}</span>
                        </a>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup class="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Your Account</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem
              v-for="item in data.projects"
              :key="item.name"
            >
              <SidebarMenuButton as-child>
                <a :href="item.url">
                  <component :is="item.icon" />
                  <span>{{ item.name }}</span>
                </a>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <SidebarMenuAction show-on-hover>
                    <MoreHorizontal />
                    <span class="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent class="w-48 rounded-lg" side="bottom" align="end">
                  <DropdownMenuItem>
                    <Folder class="text-muted-foreground" />
                    <span>View Project</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Forward class="text-muted-foreground" />
                    <span>Share Project</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Trash2 class="text-muted-foreground" />
                    <span>Delete Project</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton class="text-sidebar-foreground/70">
                <MoreHorizontal class="text-sidebar-foreground/70" />
                <span>More</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <SidebarMenuButton
                  size="lg"
                  class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar class="h-8 w-8 rounded-lg">
                    <AvatarImage src="https://avatars.githubusercontent.com/u/98240335?v=4" :alt="data.user.name" />
                    <AvatarFallback class="rounded-lg">
                      W
                    </AvatarFallback>
                  </Avatar>
                  <div class="grid flex-1 text-left text-sm leading-tight">
                    <span class="truncate font-semibold">{{ data.user.name }}</span>
                    <span class="truncate text-xs">{{ data.user.email }}</span>
                  </div>
                  <ChevronsUpDown class="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent class="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg" side="bottom" align="end" :side-offset="4">
                <DropdownMenuLabel class="p-0 font-normal">
                  <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar class="h-8 w-8 rounded-lg">
                      <AvatarImage src="https://avatars.githubusercontent.com/u/98240335?v=4" :alt="data.user.name" />
                      <AvatarFallback class="rounded-lg">
                        W
                      </AvatarFallback>
                    </Avatar>
                    <div class="grid flex-1 text-left text-sm leading-tight">
                      <span class="truncate font-semibold">{{ data.user.name }}</span>
                      <span class="truncate text-xs">{{ data.user.email }}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <Sparkles />
                    Upgrade to Pro
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <BadgeCheck />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CreditCard />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Bell />
                    Notifications
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
    <SidebarInset>
      <header class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div class="flex items-center gap-2 px-4">
          <SidebarTrigger class="-ml-1" @click="toggleSidebar" />
          <Separator orientation="vertical" class="mr-2 h-4" />

          
          <Separator orientation="vertical" class="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem class="hidden md:block">
                <BreadcrumbLink href="#">
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator class="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Feed</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <!-- Search Bar -->
         <SearchBar />

      </header>
      <slot />
      <div class="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
    </SidebarInset>
  </SidebarProvider>
</template>